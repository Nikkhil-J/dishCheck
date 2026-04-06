import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SLOW_REQUEST_THRESHOLD_MS = 2000

const PROTECTED_PATHS = [
  '/home',
  '/write-review',
  '/my-profile',
  '/settings',
  '/compare',
  '/upgrade',
  '/wishlist',
  '/notifications',
  '/rewards',
  '/claim-restaurant',
  '/restaurant-dashboard',
  '/onboarding',
  '/review-success',
  '/profile',
]

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function hasAuthToken(request: NextRequest): boolean {
  if (request.cookies.get('__session')?.value) return true
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return true
  return false
}

/**
 * UX guard only — not a security boundary.
 *
 * Edge middleware cannot verify Firebase ID tokens (no access to admin SDK),
 * so hasAuthToken() only checks for the *presence* of a cookie/header.
 *
 * Actual security is enforced in two layers:
 *  1. API routes: getRequestAuth() verifies the token via Firebase Admin SDK.
 *  2. Page routes: the Firebase client SDK re-checks auth on mount and
 *     redirects unauthenticated users via useAuth(). Do NOT remove that
 *     client-side check assuming middleware handles it.
 */
export function middleware(request: NextRequest) {
  const start = Date.now()
  const { pathname } = request.nextUrl

  if (isProtectedPath(pathname) && !hasAuthToken(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()

  const durationMs = Date.now() - start
  response.headers.set('x-request-duration', String(durationMs))

  if (pathname.startsWith('/api/') && durationMs > SLOW_REQUEST_THRESHOLD_MS) {
    console.warn(
      `[perf] Slow middleware pass: ${request.method} ${pathname} ${durationMs}ms`,
    )
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/home', '/write-review', '/my-profile', '/settings',
    '/compare', '/upgrade', '/wishlist', '/notifications', '/rewards',
    '/claim-restaurant/:path*', '/restaurant-dashboard/:path*', '/onboarding',
    '/review-success', '/profile/:path*'],
}
