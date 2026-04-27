'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
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
import { ROUTES } from '@/lib/constants/routes'
import { NotificationPopover } from '@/components/features/NotificationPopover'
import { Button } from '@/components/ui/button'
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
  const showSearchInNavbar = pathname !== ROUTES.HOME && !pathname.startsWith('/restaurant/')
  const showMobileSearchIcon = showSearchInNavbar && !pathname.startsWith('/explore')
  const [scrolled, setScrolled] = useState(false)
  const { user, isAuthenticated, isLoading } = useAuth()

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
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-3 sm:h-[68px] sm:gap-5 sm:px-6">
        <Link href={ROUTES.HOME} className="shrink-0">
          <Logo size="md" wordmarkClassName="hidden sm:inline" />
        </Link>

        <div className="mx-auto hidden min-w-0 flex-1 md:block">
          <AnimatePresence>
            {showSearchInNavbar && (
              <motion.div
                key="navbar-search"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex justify-center"
              >
                <Suspense fallback={<div className="w-full max-w-[400px]" />}>
                  <SearchBar variant="navbar" />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <CitySelector />

          {showMobileSearchIcon && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => router.push(`${ROUTES.EXPLORE}?focus=1`)}
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
                className="hidden rounded-pill border-2 px-5 font-semibold sm:inline-flex"
                render={<Link href={ROUTES.LOGIN} />}
              >
                Sign in
              </Button>
              <Button
                size="lg"
                className="hidden rounded-pill px-5 font-semibold hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow sm:inline-flex"
                render={<Link href={ROUTES.SIGNUP} />}
              >
                Sign up
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full sm:hidden"
                render={<Link href={ROUTES.LOGIN} />}
                aria-label="Sign in"
              >
                <User className="h-5 w-5" />
              </Button>
            </>
          )}

          {!isLoading && isAuthenticated && user && (
            <>

              <NotificationPopover />

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-brand-orange shadow-sm outline-none sm:h-[38px] sm:w-[38px]"
                >
                  {user.avatarUrl ? (
                    <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  ) : (
                    <span className="text-xs font-bold text-white sm:text-sm">
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
                    render={<Link href={ROUTES.MY_PROFILE} />}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href={ROUTES.WISHLIST} />}
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href={ROUTES.NOTIFICATIONS} />}
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 px-3 py-2"
                    render={<Link href={ROUTES.SETTINGS} />}
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
