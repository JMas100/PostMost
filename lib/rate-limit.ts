import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const CLEANUP_RETENTION_MS = 24 * 60 * 60 * 1000;
/** Opportunistic cleanup runs on a small fraction of calls -- cheap enough to skip a dedicated
 *  cron, since this table only ever holds lightweight rows for a handful of auth endpoints. */
const CLEANUP_PROBABILITY = 0.01;

/**
 * Fixed-window rate limit backed by Postgres. Records this attempt (regardless of outcome --
 * called before the sensitive operation runs, so both failed and successful attempts count
 * toward the limit) and reports whether the identifier is currently over its allowance.
 *
 * Not built for high-QPS API limiting -- a DB round-trip (a count + a write) per call is fine for
 * auth endpoints and the per-user action limits below, which top out at tens of legitimate calls
 * per window, not the volume a dedicated in-memory/Redis limiter would be sized for.
 */
export async function checkRateLimit(identifier: string, { windowMs, max }: RateLimitOptions): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const windowStart = new Date(Date.now() - windowMs);

  if (Math.random() < CLEANUP_PROBABILITY) {
    void prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - CLEANUP_RETENTION_MS) } } }).catch(() => {});
  }

  const count = await prisma.rateLimitHit.count({ where: { identifier, createdAt: { gte: windowStart } } });
  if (count >= max) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { identifier, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterMs = oldest ? Math.max(oldest.createdAt.getTime() + windowMs - Date.now(), 0) : windowMs;
    return { allowed: false, retryAfterMs };
  }

  await prisma.rateLimitHit.create({ data: { identifier } });
  return { allowed: true };
}

/** Best-effort client IP from the standard forwarding headers Vercel sets. Never throws --
 *  callers should treat a missing IP as "skip the IP-scoped check," not as a reason to fail. */
export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}
