'use client'

import { Suspense, type ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageShell } from '@/components/layouts/PageShell'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      router.replace(`/login?redirect=${encodeURIComponent(returnUrl)}`)
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <PageShell>{children}</PageShell>
    </>
  )
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  )
}
