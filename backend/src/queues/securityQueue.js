import { Queue } from "bullmq";
import { redisConnection } from "../../../../shared/config/redis.js";

export const securityQueue = new Queue("security", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 1000,
    },
    removeOnComplete: 200,
    removeOnFail: 1000,
  },
});

console.log("Security queue initialized");
