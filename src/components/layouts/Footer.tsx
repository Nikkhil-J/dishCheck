'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/lib/hooks/useAuth'

export function Footer() {
  const { isAuthenticated } = useAuth()

  return (
    <footer className="bg-[#1C1C2B] py-10 text-white md:py-12">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo className="text-white" size="sm" />
            <p className="text-sm text-white/50">
              Find your next favourite dish, wherever you are.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-white/60 md:gap-8">
            <Link href="/explore" className="transition-colors hover:text-white">
              Explore
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/home" className="transition-colors hover:text-white">
                  Home
                </Link>
                <Link href="/my-profile" className="transition-colors hover:text-white">
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="transition-colors hover:text-white">
                  Sign in
                </Link>
                <Link href="/signup" className="transition-colors hover:text-white">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} DishCheck. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
