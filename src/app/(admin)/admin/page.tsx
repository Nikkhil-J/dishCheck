'use client'

import { useEffect, useState } from 'react'
import { getAdminStats } from '@/lib/services/admin'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { AdminStats } from '@/lib/types'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  if (!stats) {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl">⚠️</p>
        <p className="mt-4 font-display text-lg font-bold text-bg-dark">Failed to load stats</p>
        <p className="mt-1 text-sm text-text-secondary">Please refresh the page or try again later.</p>
      </div>
    )
  }

  const cards = [
    { label: 'Restaurants', value: stats.totalRestaurants, icon: '🏪' },
    { label: 'Dishes', value: stats.totalDishes, icon: '🍽️' },
    { label: 'Reviews', value: stats.totalReviews, icon: '📝' },
    { label: 'Users', value: stats.totalUsers, icon: '👥' },
    { label: 'Pending requests', value: stats.pendingRequests, icon: '📋', highlight: stats.pendingRequests > 0 },
    { label: 'Flagged reviews', value: stats.flaggedReviews, icon: '🚩', highlight: stats.flaggedReviews > 0 },
  ]

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-bg-dark">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon, highlight }) => (
          <div key={label} className={`rounded-xl border p-5 ${highlight ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent-light)]' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{icon}</span>
              <span className={`font-display text-2xl font-bold ${highlight ? 'text-[var(--color-accent)]' : 'text-bg-dark'}`}>{value}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
