import "dotenv/config";
import { Worker } from "bullmq";
import { connectDB } from "../../../shared/config/db.js";
import { redisConnection } from "../../../shared/config/redis.js";
import BillingProposal from "../../../shared/models/BillingProposal.js";
import { optimizeTreatmentCosts } from "./optimizer.js";
import { applyDiscountRules } from "./discountEngine.js";

// Connect to MongoDB
await connectDB(process.env.MONGO_URI);

console.log("Billing Agent starting...");

const billingWorker = new Worker(
  "billing",
  async (job) => {
    const startTime = Date.now();
    console.log("\n========================================");
    console.log(`[Billing Agent] Job ${job.id} started`);
    console.log("========================================");

    try {
      const { patientId, treatments, constraints, patientConditions } = job.data;

      console.log(`Patient: ${patientId}`);
      console.log(`Treatments to optimize: ${treatments.length}`);
      console.log(`Patient conditions: ${patientConditions?.join(", ") || "None"}`);

      // 1. Optimize treatment costs using AI
      console.log("Analyzing treatment alternatives...");
      const optimizedTreatments = await optimizeTreatmentCosts(
        treatments,
        patientConditions || [],
        constraints || {}
      );

      // 2. Calculate totals
      let totalOriginal = 0;
      let totalOptimized = 0;

      for (const treatment of optimizedTreatments) {
        totalOriginal += treatment.originalCost;
        totalOptimized += treatment.selectedCost;
      }

      console.log(`Original total: $${totalOriginal.toFixed(2)}`);
      console.log(`Optimized total: $${totalOptimized.toFixed(2)}`);

      // 3. Apply discount rules
      console.log("Applying discount rules...");
      const { finalTotal, discounts } = applyDiscountRules(totalOptimized, {
        patientConditions,
        treatmentCount: treatments.length,
      });

      console.log(`Final total after discounts: $${finalTotal.toFixed(2)}`);

      // 4. Calculate savings
      const savings = totalOriginal - finalTotal;
      const savingsPercentage = ((savings / totalOriginal) * 100).toFixed(1);

      console.log(`Total savings: $${savings.toFixed(2)} (${savingsPercentage}%)`);

      // 5. Create billing proposal
      const proposal = await BillingProposal.create({
        patientId,
        treatments: optimizedTreatments,
        totalOriginal,
        totalOptimized: finalTotal,
        savings,
        savingsPercentage: parseFloat(savingsPercentage),
        optimizationStrategy: discounts.map((d) => d.description).join("; "),
      });

      const duration = Date.now() - startTime;
      console.log(`\nBilling Agent] Job ${job.id} completed in ${duration}ms`);

      return {
        status: "success",
        proposalId: proposal._id,
        savings: savings.toFixed(2),
        savingsPercentage,
        processingTime: duration,
      };
    } catch (error) {
      console.error(`[Billing Agent] Job ${job.id} failed:`, error);
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
billingWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

billingWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

billingWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Billing Agent is running and listening for jobs...");
console.log("Queue: billing");
console.log("Redis:", process.env.REDIS_HOST);
console.log("MongoDB:", process.env.MONGO_URI);
