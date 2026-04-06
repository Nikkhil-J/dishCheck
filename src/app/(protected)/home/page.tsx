'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { CUISINE_TYPES, CUISINE_EMOJI } from '@/lib/constants'

const QUICK_ACTIONS = [
  { href: '/explore', icon: '🔍', label: 'Explore Dishes', sub: 'Browse by cuisine', bg: 'from-[var(--color-primary-light)] to-[var(--color-primary)]/10' },
  { href: '/write-review', icon: '✍️', label: 'Write a Review', sub: 'Share your take', bg: 'from-[var(--color-accent-light)] to-[var(--color-accent)]/10' },
  { href: '/wishlist', icon: '❤️', label: 'Your Wishlist', sub: 'Saved dishes', bg: 'from-[var(--color-success)]/10 to-[var(--color-success)]/5' },
  { href: '/my-profile', icon: '🏆', label: 'Your Profile', sub: 'View stats', bg: 'from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/20' },
]

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/explore?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-bg-dark sm:text-3xl">
          Hey, {firstName}! 👋
        </h1>
        <p className="mt-1 text-text-secondary">What are you craving today?</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8 md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a dish..."
            className="h-auto w-full rounded-pill border-2 border-border bg-card py-3 pl-12 pr-4 text-sm placeholder:text-text-muted focus-visible:border-primary focus-visible:shadow-md"
          />
        </div>
      </form>

      {/* Quick actions */}
      <div className="mb-8 flex gap-3 overflow-x-auto scrollbar-hide">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br ${action.bg} text-xl`}>
              {action.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">{action.label}</div>
              <div className="text-xs text-text-muted">{action.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats banner */}
      {user && (
        <div className="mb-8 flex flex-wrap items-center gap-5 rounded-xl bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-display text-lg font-bold">Keep going! 🔥</h2>
            <p className="text-sm text-white/70">
              You&apos;ve written {user.reviewCount} review{user.reviewCount !== 1 ? 's' : ''}.
            </p>
          </div>
          <div className="flex gap-6">
            {[
              { num: user.reviewCount, label: 'Reviews' },
              { num: user.helpfulVotesReceived, label: 'Helpful' },
              { num: user.badges.length, label: 'Badges' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-xl font-bold">{s.num}</div>
                <div className="text-[11px] text-white/60">{s.label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/my-profile"
            className="rounded-pill bg-card px-5 py-2 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            View Profile
          </Link>
        </div>
      )}

      {/* Browse by cuisine */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-bg-dark">Browse by Cuisine</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {CUISINE_TYPES.slice(0, 7).map((c) => (
            <Link
              key={c}
              href={`/explore?cuisine=${encodeURIComponent(c)}`}
              className="flex shrink-0 items-center gap-2 rounded-pill border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              <span className="text-lg">{CUISINE_EMOJI[c] ?? '🍴'}</span>
              {c}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
