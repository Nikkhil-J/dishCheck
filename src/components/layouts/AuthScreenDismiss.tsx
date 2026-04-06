'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

function getSafeAuthDismissHref(redirect: string | null | undefined): string {
  if (redirect == null || typeof redirect !== 'string') return '/'
  const t = redirect.trim()
  if (t === '' || !t.startsWith('/')) return '/'
  if (t.startsWith('//')) return '/'
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return '/'
  if (/[\r\n<>]/.test(t)) return '/'
  return t
}

const dismissClassName = cn(
  'absolute right-4 top-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full',
  'border border-border bg-card text-text-secondary shadow-sm transition-colors',
  'hover:border-primary hover:text-primary',
  'lg:right-8 lg:top-8'
)

function DismissLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={dismissClassName}
      aria-label="Close and go back"
    >
      <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
    </Link>
  )
}

function AuthScreenDismissInner() {
  const searchParams = useSearchParams()
  const href = getSafeAuthDismissHref(searchParams.get('redirect'))
  return <DismissLink href={href} />
}

export function AuthScreenDismiss() {
  return (
    <Suspense fallback={<DismissLink href="/" />}>
      <AuthScreenDismissInner />
    </Suspense>
  )
}
