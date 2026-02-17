import { Queue } from "bullmq";
import { redisConnection } from "../../../../shared/config/redis.js";

export const diagnosticsQueue = new Queue("diagnostics", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

console.log("Diagnostics queue initialized");
