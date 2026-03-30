'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        Hey{user ? `, ${user.displayName.split(' ')[0]}` : ''}! 👋
      </h1>
      <p className="mt-1 text-gray-500">What are you looking for today?</p>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a dish or restaurant…"
            className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </form>

      {/* Browse cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/browse" className="group rounded-2xl bg-brand-light p-6 transition hover:bg-brand/20">
          <div className="text-3xl">🍜</div>
          <h3 className="mt-2 font-semibold text-brand-dark">Browse by cuisine</h3>
          <p className="text-sm text-gray-600">Explore dishes by cuisine type</p>
        </Link>
        <Link href="/browse?sort=highest-rated" className="group rounded-2xl bg-amber-50 p-6 transition hover:bg-amber-100">
          <div className="text-3xl">⭐</div>
          <h3 className="mt-2 font-semibold text-amber-800">Top rated near you</h3>
          <p className="text-sm text-gray-600">Highest rated dishes in Bengaluru</p>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Your recent reviews</h2>
        <div className="mt-4">
          <EmptyState
            icon="📝"
            title="You haven't reviewed anything yet"
            description="Find a dish you've tried and share your honest take."
            ctaLabel="Find a dish to review"
            onCta={() => router.push('/browse')}
          />
        </div>
      </div>
    </div>
  )
}
