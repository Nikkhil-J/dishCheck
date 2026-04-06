import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Tier definitions ────────────────────────────────────

export type RateLimitTier = 'REVIEW_CREATE' | 'REVIEW_EDIT' | 'REDEEM' | 'GENERAL'

interface TierConfig {
  maxRequests: number
  windowSeconds: number
}

const TIER_CONFIG: Record<RateLimitTier, TierConfig> = {
  REVIEW_CREATE: { maxRequests: 5, windowSeconds: 3600 },
  REVIEW_EDIT:   { maxRequests: 10, windowSeconds: 3600 },
  REDEEM:        { maxRequests: 3, windowSeconds: 3600 },
  GENERAL:       { maxRequests: 60, windowSeconds: 60 },
}

// ── Result type ─────────────────────────────────────────

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// ── In-memory fallback (single-instance dev/test only) ──

interface MemoryEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, MemoryEntry>()

function checkMemory(key: string, tier: TierConfig): RateLimitResult {
  const now = Date.now()
  const existing = memoryStore.get(key)

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + tier.windowSeconds * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { success: true, remaining: tier.maxRequests - 1, resetAt }
  }

  if (existing.count >= tier.maxRequests) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return {
    success: true,
    remaining: tier.maxRequests - existing.count,
    resetAt: existing.resetAt,
  }
}

// ── Upstash rate limiters (lazily created per tier) ─────

const upstashLimiters = new Map<RateLimitTier, Ratelimit>()

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getUpstashLimiter(tier: RateLimitTier): Ratelimit {
  let limiter = upstashLimiters.get(tier)
  if (limiter) return limiter

  const config = TIER_CONFIG[tier]
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds} s`),
    prefix: `ratelimit:${tier}`,
  })

  upstashLimiters.set(tier, limiter)
  return limiter
}

// ── Production startup warning ──────────────────────────

let _upstashWarningLogged = false

function logUpstashWarningOnce(): void {
  if (_upstashWarningLogged) return
  _upstashWarningLogged = true
  console.error(
    'WARNING: UPSTASH_REDIS_REST_URL is not set. Rate limiting is disabled in this instance. ' +
    'Configure Upstash for production rate limiting.',
  )
}

// ── Public API ──────────────────────────────────────────

export async function rateLimit(identifier: string, tier: RateLimitTier): Promise<RateLimitResult> {
  const config = TIER_CONFIG[tier]
  const key = `ratelimit:${tier}:${identifier}`

  if (!isUpstashConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      logUpstashWarningOnce()
    }
    return checkMemory(key, config)
  }

  const limiter = getUpstashLimiter(tier)
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  }
}

/**
 * Checks rate limit and returns a 429 NextResponse if exceeded, or null if allowed.
 * Use in route handlers: `const blocked = await checkRateLimit(userId, 'GENERAL'); if (blocked) return blocked;`
 */
export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier,
): Promise<NextResponse | null> {
  const result = await rateLimit(userId, tier)

  if (!result.success) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { message: 'Too many requests', resetAt: result.resetAt },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(retryAfterSec, 1)) },
      },
    )
  }

  return null
}
