import "dotenv/config";
import { Worker } from "bullmq";
import mongoose from "mongoose";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import BillingProposal from "../../../shared/models/BillingProposal.js";
import Patient from "../../../shared/models/Patient.js";
import Diagnostic from "../../../shared/models/Diagnostic.js";
import AuditLog from "../../../shared/models/AuditLog.js";
import { generateItemizedBill } from "./billGenerator.js";
import { checkDrugInteractions } from "../../../shared/data/drugInteractions.js";

await connectDB(process.env.MONGO_URI);

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";
let jobsProcessedToday = 0;

function sendHeartbeat() {
  fetch(`${BACKEND}/api/health/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: "billing", jobsProcessedToday }),
  }).catch(() => {});
}
setInterval(sendHeartbeat, 15000);
sendHeartbeat();

console.log("Billing Agent starting...");

// Extract drug/medication names from line items
function extractDrugsFromLineItems(lineItems) {
  const drugKeywords = ["medication", "drug", "tablet", "injection", "antibiotic"];
  const extracted = [];
  for (const item of lineItems) {
    const desc = (item.description || "").toLowerCase();
    const cat  = (item.category  || "").toLowerCase();
    const isMed = cat === "medications" || drugKeywords.some(kw => desc.includes(kw));
    if (isMed) {
      // Use the description as the drug name for interaction lookup
      extracted.push(item.description);
    }
  }
  return extracted;
}

const billingWorker = new Worker(
  "billing",
  async (job) => {
    const startTime = Date.now();
    const { patientId, patientName, requestedBy } = job.data;

    console.log(`\n[Billing Agent] Job ${job.id} — Patient: ${patientId}`);

    // 1. Load full patient context
    const patient = await Patient.findById(patientId).lean();
    if (!patient) throw new Error(`Patient ${patientId} not found`);

    // 2. Load diagnostics
    let diagnostics = [];
    try {
      diagnostics = await Diagnostic.find({ patientId }).sort({ createdAt: -1 }).lean();
    } catch {}

    // 3. Load document count
    let docCount = 0;
    try {
      const DocModel = mongoose.model("Document");
      docCount = await DocModel.countDocuments({ patientId });
    } catch {}

    console.log(`  Patient: ${patient.name}, Age: ${patient.age}`);
    console.log(`  Diagnostics: ${diagnostics.length}, Documents: ${docCount}`);
    console.log(`  Conditions: ${patient.medicalHistory?.conditions?.join(", ") || "None recorded"}`);

    // 4. Generate itemized bill via Gemini
    console.log("  Calling Gemini to generate itemized bill...");
    const { lineItems, reasoning, totalAmount, savingsPercentage } =
      await generateItemizedBill({ patient, diagnostics, docCount });

    console.log(`  Generated ${lineItems.length} line items — Total: Rs.${totalAmount}`);

    // 5. Feature 3: Drug Interaction Safety Check
    const billDrugs       = extractDrugsFromLineItems(lineItems);
    const existingMeds    = patient.medicalHistory?.medications || [];
    const conflicts       = checkDrugInteractions(billDrugs, existingMeds);
    const hasCritical     = conflicts.some(c => c.severity === "critical");
    const hasHigh         = conflicts.some(c => c.severity === "high");
    const checkedDrugs    = [...billDrugs, ...existingMeds];

    console.log(`  Drug check: ${checkedDrugs.length} drug(s) checked, ${conflicts.length} conflict(s) found`);

    // Always write to AuditLog (even when clean) for audit trail
    const highestSeverity = hasCritical ? "critical" : hasHigh ? "high" : conflicts.length > 0 ? "medium" : null;
    try {
      await AuditLog.create({
        actor:        "billing-agent",
        action:       "drug_interaction_detected",
        resourceType: "BillingProposal",
        meta: {
          patientId,
          billDrugs,
          existingMeds,
          conflicts,
          severity:    highestSeverity || "none",
          conflictCount: conflicts.length,
        },
        isAnomaly: conflicts.length > 0,
        severity:  highestSeverity || "low",
      });
    } catch (auditErr) {
      console.warn("  AuditLog write failed:", auditErr.message);
    }

    // Determine approval status based on conflict severity
    let approvalStatus = "pending_review";
    let blockedReason  = "";
    if (hasCritical) {
      approvalStatus = "blocked";
      blockedReason  = `Critical drug interaction detected: ${conflicts.filter(c => c.severity === "critical").map(c => `${c.drugs.join(" + ")} — ${c.risk}`).join("; ")}`;
      console.log(`  BLOCKED: critical drug interaction — ${blockedReason}`);
    } else if (hasHigh) {
      approvalStatus = "pending_review";
      blockedReason  = `High-severity drug interaction flagged: ${conflicts.filter(c => c.severity === "high").map(c => `${c.drugs.join(" + ")} — ${c.risk}`).join("; ")}`;
      console.log(`  WARNING: high-severity drug interaction — ${blockedReason}`);
    }

    // 6. Save billing proposal with drug interaction results
    const proposal = await BillingProposal.create({
      patientId,
      lineItems,
      itemizedBill:  lineItems,
      totalAmount,
      totalOriginal: totalAmount,
      totalOptimized: totalAmount * (1 - savingsPercentage / 100),
      savingsPercentage,
      insuranceStatus: "pending",
      approvalStatus,
      generatedBy:  "billing-agent-ai",
      aiReasoning:  reasoning,
      requestedBy:  requestedBy || "doctor",
      notes:        blockedReason || "",
      drugInteractionCheck: {
        checked:       true,
        conflicts,
        blockedReason,
      },
    });

    jobsProcessedToday++;
    sendHeartbeat();

    const duration = Date.now() - startTime;
    console.log(`  [Done] Job ${job.id} completed in ${duration}ms — Proposal: ${proposal._id} — status: ${approvalStatus}`);

    return { status: "success", proposalId: proposal._id, totalAmount, duration, approvalStatus };
  },
  { connection: redisConnection, concurrency: 3 }
);

billingWorker.on("completed", (job) => console.log(`Job ${job.id} completed`));
billingWorker.on("failed",    (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
billingWorker.on("error",     (err) => console.error("Worker error:", err));

console.log("Billing Agent is running and listening for jobs...");
console.log("Queue: billing");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
