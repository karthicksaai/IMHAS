import "dotenv/config";
import { Worker } from "bullmq";
import mongoose from "mongoose";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import BillingProposal from "../../../shared/models/BillingProposal.js";
import Patient from "../../../shared/models/Patient.js";
import Diagnostic from "../../../shared/models/Diagnostic.js";
import { generateItemizedBill } from "./billGenerator.js";

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

const billingWorker = new Worker(
  "billing",
  async (job) => {
    const startTime = Date.now();
    const { patientId, patientName, requestedBy } = job.data;

    console.log(`\n[Billing Agent] Job ${job.id} — Patient: ${patientId}`);

    // 1. Load full patient context from MongoDB
    const patient = await Patient.findById(patientId).lean();
    if (!patient) throw new Error(`Patient ${patientId} not found`);

    // 2. Load all approved/pending diagnostics for this patient
    let diagnostics = [];
    try {
      diagnostics = await Diagnostic.find({ patientId }).sort({ createdAt: -1 }).lean();
    } catch {}

    // 3. Load document count
    let docCount = 0;
    try {
      const DocModel = mongoose.model('Document');
      docCount = await DocModel.countDocuments({ patientId });
    } catch {}

    console.log(`  Patient: ${patient.name}, Age: ${patient.age}`);
    console.log(`  Diagnostics: ${diagnostics.length}, Documents: ${docCount}`);
    console.log(`  Conditions: ${patient.medicalHistory?.conditions?.join(", ") || "None recorded"}`);

    // 4. Use Gemini to generate an intelligent itemized bill
    console.log("  Calling Gemini to generate itemized bill...");
    const { lineItems, reasoning, totalAmount, savingsPercentage } =
      await generateItemizedBill({ patient, diagnostics, docCount });

    console.log(`  Generated ${lineItems.length} line items — Total: ₹${totalAmount}`);
    console.log(`  Reasoning: ${reasoning}`);

    // 5. Save the billing proposal
    const proposal = await BillingProposal.create({
      patientId,
      lineItems,
      itemizedBill: lineItems,
      totalAmount,
      totalOriginal: totalAmount,
      totalOptimized: totalAmount * (1 - savingsPercentage / 100),
      savingsPercentage,
      insuranceStatus: "pending",
      approvalStatus: "pending_review",
      generatedBy: "billing-agent-ai",
      aiReasoning: reasoning,
      requestedBy: requestedBy || "doctor",
    });

    jobsProcessedToday++;
    sendHeartbeat();

    const duration = Date.now() - startTime;
    console.log(`  [Done] Job ${job.id} completed in ${duration}ms — Proposal: ${proposal._id}`);

    return { status: "success", proposalId: proposal._id, totalAmount, duration };
  },
  { connection: redisConnection, concurrency: 3 }
);

billingWorker.on("completed", (job) => console.log(`✓ Job ${job.id} completed`));
billingWorker.on("failed", (job, err) => console.error(`✗ Job ${job?.id} failed:`, err.message));
billingWorker.on("error", (err) => console.error("Worker error:", err));

console.log("Billing Agent is running and listening for jobs...");
console.log("Queue: billing");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
