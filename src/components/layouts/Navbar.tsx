'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Search, Bell, User, Heart, Settings, LogOut, MapPin, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useAuth, logout } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/store/authStore'
import { updateUser } from '@/lib/services/users'
import { useCityContext } from '@/lib/context/CityContext'
import { SUPPORTED_CITIES } from '@/lib/constants'
import type { City } from '@/lib/constants'
import { UserAvatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SearchBar } from '@/components/features/SearchBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

function CitySelector() {
  const { city, setCity } = useCityContext()
  const cityRouter = useRouter()
  const storeUser = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleCityChange(c: City) {
    setCity(c)
    setOpen(false)
    if (storeUser?.id) {
      updateUser(storeUser.id, { city: c }).catch(() => {})
    }
    cityRouter.refresh()
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((prev) => !prev)}
      className="flex items-center gap-1.5 rounded-pill border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:border-primary"
    >
      <MapPin size={13} className="text-primary" />
      <span className="hidden sm:inline">{city}</span>
      <ChevronDown
        size={13}
        className={cn('text-text-muted transition-transform duration-200', open && 'rotate-180')}
      />
    </button>
  )

  const menu = open && (
    <div className="absolute left-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
      {SUPPORTED_CITIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => handleCityChange(c)}
          className={cn(
            'flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted',
            c === city ? 'font-semibold text-primary' : 'text-text-primary'
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', c === city ? 'bg-primary' : 'bg-transparent')} />
          {c}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={dropdownRef} className="relative">
      {trigger}
      {menu}
    </div>
  )
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const showSearch = pathname !== '/'
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, isAuthenticated, isLoading } = useAuth()
  const authUser = useAuthStore((s) => s.authUser)

  const fetchUnreadCount = useCallback(async () => {
    if (!authUser) return
    try {
      const token = await authUser.getIdToken()
      const res = await fetch('/api/notifications/unread-count', {
        headers: { authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count ?? 0)
      }
    } catch { /* ignore */ }
  }, [authUser])

  useEffect(() => {
    if (!isAuthenticated || !authUser) return
    const initialTimer = setTimeout(fetchUnreadCount, 0)
    const interval = setInterval(fetchUnreadCount, 120_000)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') fetchUnreadCount()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, authUser, fetchUnreadCount])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl transition-all duration-200',
        scrolled ? 'border-border shadow-sm' : 'border-transparent'
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-5 px-6">
        <Link href="/" className="shrink-0">
          <Logo size="md" />
        </Link>

        <div className="mx-auto flex-1">
          <AnimatePresence>
            {showSearch && (
              <motion.div
                key="navbar-search"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex justify-center"
              >
                <Suspense fallback={<div className="w-[400px]" />}>
                  <SearchBar variant="navbar" />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <CitySelector />

          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => router.push('/explore')}
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-text-secondary" />
            </Button>
          )}

          <ThemeToggle />

          {!isLoading && !isAuthenticated && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border-2 px-5 font-semibold inline-flex"
                render={<Link href="/login" />}
              >
                Sign in
              </Button>
              <Button
                size="lg"
                className="rounded-pill px-5 font-semibold hover:-translate-y-0.5 hover:shadow-glow"
                render={<Link href="/signup" />}
              >
                Sign up
              </Button>
            </>
          )}

          {!isLoading && isAuthenticated && user && (
            <>

              <Link
                href="/notifications"
                className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-bg-cream text-text-secondary transition-colors hover:border-primary hover:text-primary"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] rounded-full px-1 text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-secondary shadow-sm outline-none"
                >
                  {user.avatarUrl ? (
                    <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {user.displayName?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  )}
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={8} className="w-48">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs text-text-muted">DishPoints</p>
                    <p className="text-sm font-bold text-primary">
                      {user.dishPointsBalance ?? 0} pts
                    </p>
                  </div>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href="/my-profile" />}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href="/wishlist" />}
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href="/notifications" />}
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href="/settings" />}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="gap-2 px-3 py-2"
                    onSelect={() => logout()}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
