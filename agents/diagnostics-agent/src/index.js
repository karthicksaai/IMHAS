import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import Diagnostic from "../../../shared/models/Diagnostic.js";
import { retrieveRelevantChunks } from "./retriever.js";
import { generateDiagnosticResponse } from "./llmClient.js";

await connectDB(process.env.MONGO_URI);

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

      // 1. Retrieve relevant chunks via RAG
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
          processingTime: Date.now() - startTime,
        });
        return { status: "no_context", diagnosticId };
      }

      // 2. Generate response — may be rejected by confidence threshold
      const { response, confidence, rejected, rejectionReason } = await generateDiagnosticResponse(
        question,
        relevantChunks,
        { isSecondOpinion }
      );

      const processingTime = Date.now() - startTime;

      if (rejected) {
        // Confidence too low — log and return rejection, don't give the doctor garbage
        console.log(`❌ Diagnostic rejected due to low confidence (${confidence}%)`);
        await Diagnostic.findByIdAndUpdate(diagnosticId, {
          response: null,
          rejected: true,
          rejectionReason,
          confidence,
          status: "completed",
          approvalStatus: "rejected",
          retrievedChunks: relevantChunks.map((c) => ({
            text: c.text,
            similarity: c.similarity,
            chunkId: c.chunkId,
          })),
          processingTime,
        });
        return { status: "rejected_low_confidence", diagnosticId, confidence };
      }

      // 3. Save successful result — awaits doctor approval
      await Diagnostic.findByIdAndUpdate(diagnosticId, {
        response,
        retrievedChunks: relevantChunks.map((c) => ({
          text: c.text,
          similarity: c.similarity,
          chunkId: c.chunkId,
        })),
        confidence,
        status: "completed",
        approvalStatus: "pending_review", // Doctor must approve before it's official
        isSecondOpinion: isSecondOpinion || false,
        processingTime,
      });

      console.log(`✅ Diagnostic completed (confidence: ${confidence}%) — awaiting doctor review`);
      return { status: "success", diagnosticId, confidence, processingTime };
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
