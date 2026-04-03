import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import Patient from "../../../shared/models/Patient.js";
import Document from "../../../shared/models/Document.js";
import { parseIntakeDocument } from "./parser.js";
import { processDocument } from "./processor.js";

// Connect to MongoDB
await connectDB(process.env.MONGO_URI);

// Initialize RAG queue to trigger indexing
const ragQueue = new Queue("rag", { connection: redisConnection });

// ── Heartbeat ─────────────────────────────────────────────────────────────────
const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";
const AGENT_NAME = "intake";
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
// ─────────────────────────────────────────────────────────────────────────────

console.log("Intake Agent starting...");

const intakeWorker = new Worker(
  "intake",
  async (job) => {
    const startTime = Date.now();
    console.log("\n========================================");
    console.log(`[Intake Agent] Job ${job.id} started`);
    console.log("========================================");

    try {
      const { patientId, docId, name, age, rawText, base64File, metadata } = job.data;

      // 1. Verify patient exists
      let patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
      }

      console.log(`Patient verified: ${patient.name} (${patientId})`);

      // 2. Process document text
      let processedText = rawText;
      if (!processedText && base64File) {
        processedText = Buffer.from(base64File, "base64").toString("utf8");
      }

      if (!processedText || !processedText.trim()) {
        console.log("No document text to process");
        return { status: "no_document", patientId };
      }

      console.log(`Document text length: ${processedText.length} characters`);

      // 3. Extract structured medical data using LLM
      console.log("Extracting structured medical data...");
      const medicalData = await parseIntakeDocument(processedText);

      // 4. Update patient record with extracted data
      await Patient.findByIdAndUpdate(patientId, {
        summary: medicalData.summary || "",
        medicalHistory: {
          allergies: medicalData.allergies || [],
          medications: medicalData.medications || [],
          conditions: medicalData.conditions || [],
          vitals: medicalData.vitals || {},
        },
      });

      console.log("Patient medical history updated");

      // 5. Advanced document processing
      const processedMetadata = await processDocument(processedText, medicalData);

      console.log("Document metadata:", processedMetadata);
      console.log("Document processing completed");

      // 6. Use docId passed directly from the controller (reliable)
      if (docId) {
        console.log(`Sending document ${docId} to RAG indexer...`);
        await ragQueue.add("index-document", {
          patientId,
          docId,
          text: processedText,
          metadata: processedMetadata,
        });
        console.log("RAG indexing job queued successfully");
      } else {
        console.log("No docId in job data, attempting fallback document lookup...");
        const doc = await Document.findOne({ patientId }).sort({ createdAt: -1 });
        if (doc) {
          await ragQueue.add("index-document", {
            patientId,
            docId: doc._id.toString(),
            text: processedText,
            metadata: processedMetadata,
          });
          console.log("RAG indexing job queued via fallback");
        } else {
          console.log("No document found, skipping RAG indexing");
        }
      }

      jobsProcessedToday++;
      sendHeartbeat();

      const duration = Date.now() - startTime;
      console.log(`\n[Intake Agent] Job ${job.id} completed in ${duration}ms`);

      return {
        status: "success",
        patientId,
        medicalDataExtracted: true,
        ragIndexingQueued: !!docId,
        processingTime: duration,
      };
    } catch (error) {
      console.error(`[Intake Agent] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// Worker event handlers
intakeWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

intakeWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

intakeWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Intake Agent is running and listening for jobs...");
console.log("Queue: intake");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
