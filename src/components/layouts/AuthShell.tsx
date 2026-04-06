import { type ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { AuthScreenDismiss } from '@/components/layouts/AuthScreenDismiss'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Branded panel (desktop only) */}
      <div className="hidden w-[45%] flex-col justify-between bg-gradient-to-br from-primary via-primary-dark to-[#1C1C2B] p-10 text-white lg:flex">
        <Link href="/">
          <Logo className="text-white" size="md" />
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Discover dishes<br />you&apos;ll love.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join thousands of food lovers sharing honest reviews — one dish at a time.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-white/50">
            <div>
              <span className="block font-display text-2xl font-bold text-white">500+</span>
              Dishes reviewed
            </div>
            <div>
              <span className="block font-display text-2xl font-bold text-white">50+</span>
              Restaurants
            </div>
            <div>
              <span className="block font-display text-2xl font-bold text-white">2</span>
              Cities
            </div>
          </div>
        </div>
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} DishCheck
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 pt-16 lg:pt-12">
        <AuthScreenDismiss />
        <Link href="/" className="mb-8 lg:hidden">
          <Logo size="lg" />
        </Link>
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-bg-dark">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
