import { Redis } from "ioredis";

const isUpstash = process.env.REDIS_HOST?.includes("upstash.io");

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Upstash requires TLS — local Redis does not
  tls: isUpstash ? {} : undefined,
  maxRetriesPerRequest: null,
  // Cap retries so it doesn't loop forever on bad credentials
  retryStrategy(times) {
    if (times > 5) return null; // stop retrying after 5 attempts
    return Math.min(times * 200, 2000);
  },
};

export const redisConnection = redisConfig;

export const redisClient = new Redis(redisConfig);

redisClient.on("connect", () => console.log(" Redis connected"));
redisClient.on("error", (err) => console.error("Redis error:", err.message));

export default redisClient;
