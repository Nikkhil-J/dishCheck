'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useAuth, logout } from '@/lib/hooks/useAuth'
import { UserAvatar } from '@/components/ui/Avatar'

export function Navbar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 font-bold text-brand">
          <span className="text-xl">🍽️</span>
          <span className="text-lg">DishCheck</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="mx-auto hidden w-full max-w-md sm:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes or restaurants…"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </form>

        {/* Auth */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!isLoading && !isAuthenticated && (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Sign in</Link>
              <Link href="/signup" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'bg-brand hover:bg-brand-dark')}>Sign up</Link>
            </>
          )}
          {!isLoading && isAuthenticated && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100"
              >
                <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <Link href="/home" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>Home</Link>
                  <Link href="/my-profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                  <Link href="/wishlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>Wishlist</Link>
                  <Link href="/notifications" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>Notifications</Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>Settings</Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => { logout(); setDropdownOpen(false) }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
