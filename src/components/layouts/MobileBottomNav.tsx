'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'

const navItems = [
  { href: '/home', label: 'Home', icon: Home, authOnly: true },
  { href: '/', label: 'Home', icon: Home, authOnly: false, guestOnly: true },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/write-review', label: 'Review', icon: Plus, isFab: true, authOnly: true },
  { href: '/wishlist', label: 'Saved', icon: Heart, authOnly: true },
  { href: '/my-profile', label: 'Profile', icon: User, authOnly: true },
  { href: '/login', label: 'Sign in', icon: User, guestOnly: true },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  const visibleItems = navItems.filter((item) => {
    if (item.authOnly && !isAuthenticated) return false
    if (item.guestOnly && isAuthenticated) return false
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/96 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      {visibleItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href === '/home' && pathname === '/') ||
          (item.href === '/explore' && pathname.startsWith('/explore'))
        const Icon = item.icon

        if (item.isFab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-glow">
                <Icon className="h-[22px] w-[22px]" strokeWidth={2.5} />
              </span>
              <span className="text-[10px] font-medium text-text-muted">{item.label}</span>
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-text-muted'
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
