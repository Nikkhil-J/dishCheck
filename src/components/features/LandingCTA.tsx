'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

export function LandingCTA() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null

  return (
    <section className="bg-gradient-to-r from-primary to-secondary px-6 py-16 text-center text-white">
      <h2 className="font-display text-3xl font-bold">Ready to discover?</h2>
      <p className="mt-3 text-lg text-white/70">
        {isAuthenticated
          ? 'Explore dishes and share your honest reviews.'
          : 'Join the community and share your honest reviews.'}
      </p>
      <Link
        href={isAuthenticated ? '/explore' : '/signup'}
        className="mt-6 inline-flex items-center justify-center rounded-pill bg-background px-8 py-3 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        {isAuthenticated ? 'Explore dishes' : 'Create free account'}
      </Link>
    </section>
  )
}
