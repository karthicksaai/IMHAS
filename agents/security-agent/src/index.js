import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import AuditLog from "../../../shared/models/AuditLog.js";
import { detectAnomalies } from "./detector.js";
import { sendAlert } from "./alerter.js";

// Connect to MongoDB
await connectDB(process.env.MONGO_URI);

console.log("Security Agent starting...");

const securityWorker = new Worker(
  "security",
  async (job) => {
    const startTime = Date.now();
    console.log("\n========================================");
    console.log(`[Security Agent] Job ${job.id} started`);
    console.log("========================================");

    try {
      const { auditId, actor, action, resourceType, resourceId, timestamp } = job.data;

      console.log(` Actor: ${actor}`);
      console.log(`Action: ${action}`);
      console.log(`Resource: ${resourceType}/${resourceId}`);

      // 1. Detect anomalies
      console.log("Analyzing for security anomalies...");
      const anomalies = await detectAnomalies({
        auditId,
        actor,
        action,
        resourceType,
        resourceId,
        timestamp: timestamp || new Date(),
      });

      if (anomalies.length > 0) {
        console.log(`ALERT: ${anomalies.length} anomaly(ies) detected!`);

        // 2. Update audit log with anomaly flags
        const highestSeverity = anomalies.reduce((max, a) =>
          getSeverityLevel(a.severity) > getSeverityLevel(max)
            ? a.severity
            : max
        , "low");

        await AuditLog.findByIdAndUpdate(auditId, {
          isAnomaly: true,
          anomalyReason: anomalies.map((a) => a.reason).join("; "),
          severity: highestSeverity,
        });

        // 3. Send alerts for critical anomalies
        for (const anomaly of anomalies) {
          console.log(` ${anomaly.severity.toUpperCase()}: ${anomaly.reason}`);

          if (anomaly.severity === "high" || anomaly.severity === "critical") {
            await sendAlert(anomaly, {
              auditId,
              actor,
              action,
              resourceType,
              resourceId,
            });
          }
        }
      } else {
        console.log("No anomalies detected");
      }

      const duration = Date.now() - startTime;
      console.log(`\n[Security Agent] Job ${job.id} completed in ${duration}ms`);

      return {
        status: "success",
        anomaliesDetected: anomalies.length,
        processingTime: duration,
      };
    } catch (error) {
      console.error(`[Security Agent] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 1000,
    },
  }
);

function getSeverityLevel(severity) {
  const levels = { low: 1, medium: 2, high: 3, critical: 4 };
  return levels[severity] || 1;
}

// Worker event handlers
securityWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

securityWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

securityWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Security Agent is running and listening for jobs...");
console.log("Queue: security");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
