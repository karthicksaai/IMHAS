import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import Diagnostic from "../../../shared/models/Diagnostic.js";
import { retrieveRelevantChunks } from "./retriever.js";
import { generateDiagnosticResponse } from "./llmClient.js";

// Connect to MongoDB
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
      const { diagnosticId, patientId, question } = job.data;

      console.log(`Diagnostic ID: ${diagnosticId}`);
      console.log(`Patient: ${patientId}`);
      console.log(`Question: ${question}`);

      // Update status to processing
      await Diagnostic.findByIdAndUpdate(diagnosticId, {
        status: "processing",
      });

      // 1. Retrieve relevant chunks using RAG
      console.log("Retrieving relevant medical context...");
      const topK = parseInt(process.env.TOP_K) || 6;
      const relevantChunks = await retrieveRelevantChunks(patientId, question, topK);

      console.log(`Retrieved ${relevantChunks.length} relevant chunks`);
      console.log(
        `📊 Similarity scores: ${relevantChunks.map((c) => c.similarity.toFixed(3)).join(", ")}`
      );

      if (relevantChunks.length === 0) {
        console.log("No relevant context found");

        await Diagnostic.findByIdAndUpdate(diagnosticId, {
          response: "No medical records found for this patient. Please upload documents first.",
          status: "completed",
          confidence: 0,
          processingTime: Date.now() - startTime,
        });

        return {
          status: "no_context",
          diagnosticId,
        };
      }

      // 2. Generate diagnostic response using LLM
      console.log("Generating diagnostic response with Gemini...");
      const { response, confidence } = await generateDiagnosticResponse(
        question,
        relevantChunks
      );

      console.log(`Response generated (confidence: ${confidence}%)`);

      // 3. Update diagnostic record
      const processingTime = Date.now() - startTime;

      await Diagnostic.findByIdAndUpdate(diagnosticId, {
        response,
        retrievedChunks: relevantChunks.map((chunk) => ({
          text: chunk.text,
          similarity: chunk.similarity,
          chunkId: chunk.chunkId,
        })),
        confidence,
        status: "completed",
        processingTime,
      });

      console.log(`\n[Diagnostics Agent] Job ${job.id} completed in ${processingTime}ms`);

      return {
        status: "success",
        diagnosticId,
        confidence,
        chunksRetrieved: relevantChunks.length,
        processingTime,
      };
    } catch (error) {
      console.error(`[Diagnostics Agent] Job ${job.id} failed:`, error);

      // Update diagnostic with error
      if (job.data.diagnosticId) {
        await Diagnostic.findByIdAndUpdate(job.data.diagnosticId, {
          status: "error",
          errorMessage: error.message,
        });
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

// Worker event handlers
diagnosticsWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

diagnosticsWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

diagnosticsWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Diagnostics Agent is running and listening for jobs...");
console.log("Queue: diagnostics");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
