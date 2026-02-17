import { Queue } from "bullmq";
import { redisConnection } from "../../../../shared/config/redis.js";

export const billingQueue = new Queue("billing", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

console.log("Billing queue initialized");
