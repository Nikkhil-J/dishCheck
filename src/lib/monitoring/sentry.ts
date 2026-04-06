import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? ''
const IS_ENABLED = SENTRY_DSN.length > 0

const PII_FIELDS = new Set([
  'password', 'token', 'secret', 'authorization', 'cookie',
  'email', 'phone', 'ssn', 'creditcard',
])

export function scrubPii(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = scrubPii(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

export interface CaptureContext {
  userId?: string
  route?: string
  requestBody?: Record<string, unknown>
  extra?: Record<string, unknown>
}

/**
 * Captures an error with context. Falls back to console.error when Sentry is
 * not configured (SENTRY_DSN absent).
 */
export function captureError(error: unknown, context?: CaptureContext): void {
  const errObj = error instanceof Error ? error : new Error(String(error))

  if (!IS_ENABLED) {
    const logPayload = context
      ? JSON.stringify({ userId: context.userId, route: context.route, extra: context.extra })
      : ''
    console.error(`[monitoring] ${errObj.message}`, logPayload)
    return
  }

  const extra: Record<string, unknown> = {}
  if (context) {
    const scrubbed = scrubPii({
      ...(context.extra ?? {}),
      ...(context.requestBody ? { requestBody: context.requestBody } : {}),
    })
    Object.assign(extra, scrubbed)
    if (context.route) extra.route = context.route
  }

  Sentry.captureException(errObj, {
    extra,
    user: context?.userId ? { id: context.userId } : undefined,
  })
}

/**
 * Adds a breadcrumb for tracing. No-op when Sentry is disabled.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!IS_ENABLED) return

  Sentry.addBreadcrumb({
    message,
    data: data ? scrubPii(data) : undefined,
  })
}

const SLOW_REQUEST_THRESHOLD_MS = 2000

/**
 * Logs API route duration. Sends a Sentry message for slow routes.
 */
export function logRouteDuration(route: string, durationMs: number, userId?: string): void {
  if (durationMs <= SLOW_REQUEST_THRESHOLD_MS) return

  if (!IS_ENABLED) {
    console.warn(`[monitoring:slow] ${route} took ${durationMs}ms`, userId ? `user=${userId}` : '')
    return
  }

  Sentry.captureMessage(`Slow route: ${route} (${durationMs}ms)`, {
    level: 'warning',
    extra: { route, durationMs },
    user: userId ? { id: userId } : undefined,
  })
}
