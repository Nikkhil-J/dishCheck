'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/requests', label: 'Dish Requests', icon: '📋' },
  { href: '/admin/reviews', label: 'Flagged Reviews', icon: '🚩' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { href: '/admin/restaurant-claims', label: 'Restaurant Claims', icon: '🏪' },
]

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (!user.isAdmin) {
    router.push('/')
    return null
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-background">
        <Link href="/" className="flex items-center gap-1.5 border-b border-border px-5 py-4 font-display font-bold text-primary">
          <span>🍽️</span>
          <span>DishCheck</span>
        </Link>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === href
                  ? 'bg-primary-light font-medium text-primary-dark'
                  : 'text-text-secondary hover:bg-bg-cream hover:text-bg-dark',
              )}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface p-6">{children}</main>
    </div>
  )
}
