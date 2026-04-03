import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import Diagnostic from "../../../shared/models/Diagnostic.js";
import { retrieveRelevantChunks } from "./retriever.js";
import { generateDiagnosticResponse } from "./llmClient.js";

await connectDB(process.env.MONGO_URI);

// Queue reference for auto-triggering second opinions
const diagnosticsQueue = new Queue("diagnostics", { connection: redisConnection });

// Heartbeat
const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";
const AGENT_NAME = "diagnostics";
let jobsProcessedToday = 0;

function sendHeartbeat() {
  fetch(`${BACKEND}/api/health/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: AGENT_NAME, jobsProcessedToday }),
  }).catch(() => {});
}

setInterval(sendHeartbeat, 15000);
sendHeartbeat();

console.log("Diagnostics Agent starting...");

const diagnosticsWorker = new Worker(
  "diagnostics",
  async (job) => {
    const startTime = Date.now();
    console.log("\n========================================");
    console.log(`[Diagnostics Agent] Job ${job.id} started`);
    console.log("========================================");

    try {
      const { diagnosticId, patientId, question, isSecondOpinion } = job.data;

      console.log(`Diagnostic ID: ${diagnosticId}`);
      console.log(`Patient: ${patientId}`);
      console.log(`Question: ${question}`);
      console.log(`Second opinion: ${isSecondOpinion || false}`);

      await Diagnostic.findByIdAndUpdate(diagnosticId, { status: "processing" });

      // 1. Retrieve relevant chunks via RAG (recency-weighted)
      const topK = parseInt(process.env.TOP_K) || 6;
      const relevantChunks = await retrieveRelevantChunks(patientId, question, topK);

      console.log(`Retrieved ${relevantChunks.length} relevant chunks`);

      if (relevantChunks.length === 0) {
        await Diagnostic.findByIdAndUpdate(diagnosticId, {
          response: null,
          status: "completed",
          confidence: 0,
          rejected: true,
          rejectionReason: "No medical records found for this patient. Please upload documents first.",
          approvalStatus: "pending_review",
          hitlBand: "second_opinion",
          processingTime: Date.now() - startTime,
        });
        return { status: "no_context", diagnosticId };
      }

      // 2. Generate response with HITL band logic
      const { response, confidence, hitlBand, approvalStatus, rejected, rejectionReason } =
        await generateDiagnosticResponse(question, relevantChunks, { isSecondOpinion });

      const processingTime = Date.now() - startTime;

      console.log(`Confidence: ${confidence}% -> hitlBand: ${hitlBand}`);

      if (rejected) {
        console.log(`Diagnostic rejected — band: ${hitlBand} (${confidence}%)`);
        await Diagnostic.findByIdAndUpdate(diagnosticId, {
          response: null,
          rejected: true,
          rejectionReason,
          confidence,
          hitlBand,
          status: "completed",
          approvalStatus: "rejected",
          retrievedChunks: relevantChunks.map((c) => ({
            text: c.text,
            similarity: c.similarity,
            finalScore: c.finalScore,
            chunkId: c.chunkId,
          })),
          processingTime,
        });

        // Auto-queue second opinion when band is second_opinion and this is not already one
        if (hitlBand === "second_opinion" && !isSecondOpinion) {
          console.log("Auto-queuing second opinion due to second_opinion band...");
          const soDoc = await Diagnostic.create({
            patientId,
            question,
            status: "pending",
            approvalStatus: "pending_review",
            isSecondOpinion: true,
            originalDiagnosticId: diagnosticId,
            hitlBand: "second_opinion",
          });
          await diagnosticsQueue.add("diagnose", {
            diagnosticId: soDoc._id.toString(),
            patientId,
            question,
            isSecondOpinion: true,
          });
          console.log(`Second opinion queued: ${soDoc._id}`);
        }

        return { status: "rejected_low_confidence", diagnosticId, confidence, hitlBand };
      }

      // 3. Save successful result with hitlBand and resolved approvalStatus
      await Diagnostic.findByIdAndUpdate(diagnosticId, {
        response,
        retrievedChunks: relevantChunks.map((c) => ({
          text: c.text,
          similarity: c.similarity,
          finalScore: c.finalScore,
          chunkId: c.chunkId,
        })),
        confidence,
        hitlBand,
        status: "completed",
        approvalStatus: approvalStatus || "pending_review",
        isSecondOpinion: isSecondOpinion || false,
        processingTime,
      });

      if (hitlBand === "auto_approve") {
        console.log(`Diagnostic auto-approved (confidence: ${confidence}% >= 90%)`);
      } else {
        console.log(`Diagnostic completed (confidence: ${confidence}%) — band: ${hitlBand} — awaiting doctor review`);
      }

      jobsProcessedToday++;
      sendHeartbeat();

      return { status: "success", diagnosticId, confidence, hitlBand, processingTime };
    } catch (error) {
      console.error(`[Diagnostics Agent] Job ${job.id} failed:`, error);
      if (job.data.diagnosticId) {
        await Diagnostic.findByIdAndUpdate(job.data.diagnosticId, {
          status: "error",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 3, limiter: { max: 5, duration: 1000 } }
);

diagnosticsWorker.on("completed", (job) => console.log(`Job ${job.id} completed`));
diagnosticsWorker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
diagnosticsWorker.on("error", (err) => console.error("Worker error:", err));

console.log("Diagnostics Agent running — queue: diagnostics");
