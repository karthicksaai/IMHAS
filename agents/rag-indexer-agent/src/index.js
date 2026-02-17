import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import Embedding from "../../../shared/models/Embedding.js";
import { chunkText } from "./chunker.js";
import { embedChunks } from "./embedder.js";
import { storeVectors } from "./vectorStore.js";

// Connect to MongoDB
await connectDB(process.env.MONGO_URI);

console.log("RAG Indexer Agent starting...");

const ragWorker = new Worker(
  "rag",
  async (job) => {
    const startTime = Date.now();
    console.log("\n========================================");
    console.log(`[RAG Indexer] Job ${job.id} started`);
    console.log("========================================");

    try {
      const { patientId, docId, text, metadata } = job.data;

      console.log(`Document: ${docId}`);
      console.log(`Patient: ${patientId}`);
      console.log(`Text length: ${text.length} characters`);

      // 1. Chunk the document text
      console.log("Chunking document...");
      const chunks = chunkText(text, {
        size: 500,
        overlap: 100,
      });
      console.log(`Created ${chunks.length} chunks`);

      // 2. Generate embeddings for all chunks
      console.log("Generating embeddings...");
      const vectors = await embedChunks(chunks);
      console.log(`Generated ${vectors.length} embeddings (384-dim each)`);

      // 3. Store vectors in MongoDB
      console.log("Storing embeddings in database...");
      const stored = await storeVectors({
        patientId,
        docId,
        chunks,
        vectors,
        metadata,
      });
      console.log(`Stored ${stored} embeddings`);

      const duration = Date.now() - startTime;
      console.log(`\n[RAG Indexer] Job ${job.id} completed in ${duration}ms`);

      return {
        status: "success",
        patientId,
        docId,
        chunksIndexed: chunks.length,
        embeddingsStored: stored,
        processingTime: duration,
      };
    } catch (error) {
      console.error(`[RAG Indexer] Job ${job.id} failed:`, error);
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
ragWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

ragWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

ragWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("RAG Indexer Agent is running and listening for jobs...");
console.log("Queue: rag");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
