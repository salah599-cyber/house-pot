import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { success: true } | { success: false; error: string };

const redis = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
})();

function createLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!redis) {
    return null;
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "house-pot",
  });
}

const limiters = {
  join: createLimiter(30, "1 m"),
  invitePage: createLimiter(40, "1 m"),
  onboarding: createLimiter(10, "1 m"),
  webhook: createLimiter(120, "1 m"),
  sendInvites: createLimiter(60, "1 h"),
};

async function runLimit(
  bucket: keyof typeof limiters,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[bucket];
  if (!limiter) {
    return { success: true };
  }

  const result = await limiter.limit(identifier);
  if (!result.success) {
    return {
      success: false,
      error: "Too many requests. Please wait a moment and try again.",
    };
  }

  return { success: true };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function rateLimitJoin(ip: string) {
  return runLimit("join", `join:${ip}`);
}

export async function rateLimitInvitePage(ip: string) {
  return runLimit("invitePage", `invite:${ip}`);
}

export async function rateLimitOnboarding(ip: string) {
  return runLimit("onboarding", `onboarding:${ip}`);
}

export async function rateLimitWebhook(ip: string) {
  return runLimit("webhook", `webhook:${ip}`);
}

export async function rateLimitSendInvites(userId: string) {
  return runLimit("sendInvites", `invites:${userId}`);
}

export function isRateLimitConfigured() {
  return Boolean(redis);
}
