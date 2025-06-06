import Redis from "ioredis";
import Redlock from "redlock";

// Connect to Redis
export const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => console.log("✅ Connected to Redis"));
redisClient.on("error", (err) => console.error("❌ Redis error:", err));

// Distributed Lock (Redlock)
export const redlock = new Redlock([redisClient], {
  retryCount: 3,
  retryDelay: 200,
});
