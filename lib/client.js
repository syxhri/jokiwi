import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  const ip = request.ip || (xff && xff.split(",")[0].trim()) || "0.0.0.0";
  return ip;
}

// const redis = Redis.fromEnv();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// 5x/10m/IP
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:auth",
});

// 80x/1m/IP
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, "1 m"),
  prefix: "rl:api",
});

// 50x/1m/IP
export const qrisLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  prefix: "rl:qris",
});
