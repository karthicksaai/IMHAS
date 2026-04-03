import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import { smartChunkText } from "./chunker.js";
import { embedChunks } from "./embedder.js";
import { storeVectors } from "./vectorStore.js";

await connectDB(process.env.MONGO_URI);

console.log("RAG Indexer Agent starting...");
console.log("Queue: rag");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);

const ragWorker = new Worker(
  "rag",
  async (job) => {
    const startTime = Date.now();
    console.log("\n------- RAG Indexer Job", job.id, "-------");

    const { patientId, docId, text, metadata } = job.data;

    if (!text || !text.trim()) {
      console.warn(`Job ${job.id}: empty text received, skipping`);
      return { status: "skipped", reason: "empty text" };
    }

    console.log(`Patient : ${patientId}`);
    console.log(`Document: ${docId}`);
    console.log(`Text    : ${text.length} characters`);

    // 1. Chunk
    const chunks = smartChunkText(text, { maxSize: 600, minSize: 100, overlap: 80 });
    if (chunks.length === 0) {
      console.warn("No chunks produced, skipping");
      return { status: "skipped", reason: "no chunks" };
    }
    console.log(`Chunks  : ${chunks.length}`);

    // 2. Embed
    const vectors = await embedChunks(chunks);
    console.log(`Vectors : ${vectors.length} x ${vectors[0]?.length}-dim`);

    // 3. Store
    const stored = await storeVectors({ patientId, docId, chunks, vectors, metadata });
    console.log(`Stored  : ${stored} embeddings`);

    const ms = Date.now() - startTime;
    console.log(`Done in ${ms}ms`);

    return { status: "success", patientId, docId, chunksIndexed: chunks.length, stored, ms };
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

ragWorker.on("completed", (job) => console.log(`Job ${job.id} completed`));
ragWorker.on("failed",    (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
ragWorker.on("error",     (err) => console.error("Worker error:", err));

console.log("RAG Indexer Agent is running and listening for jobs...");
