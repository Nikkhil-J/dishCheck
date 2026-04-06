'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRating } from '@/lib/utils/index'
import type { RestaurantAnalytics } from '@/lib/services/restaurant-analytics'

export default function RestaurantDashboardPage() {
  const params = useParams<{ restaurantId: string }>()
  const router = useRouter()
  const { authUser } = useAuth()

  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authUser || !params.restaurantId) return

    async function load() {
      const token = await authUser!.getIdToken()
      const res = await fetch(
        `/api/restaurants/${encodeURIComponent(params.restaurantId)}/analytics`,
        { headers: { authorization: `Bearer ${token}` } }
      )

      if (res.status === 403) {
        router.replace(`/claim-restaurant/${params.restaurantId}`)
        return
      }

      if (!res.ok) {
        setError('Failed to load analytics')
        setLoading(false)
        return
      }

      const data = await res.json()
      setAnalytics(data)
      setLoading(false)
    }

    load()
  }, [authUser, params.restaurantId, router])

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-lg font-semibold text-bg-dark">{error ?? 'Something went wrong'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bg-dark">{analytics.restaurantName}</h1>
          <p className="mt-0.5 text-sm text-text-muted">Restaurant analytics dashboard</p>
        </div>
        <Link
          href={`/restaurant-dashboard/${params.restaurantId}/dishes`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Per-dish breakdown
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Reviews (30d)" value={String(analytics.totalReviews30d)} />
        <StatCard label="Avg rating" value={formatRating(analytics.avgOverallRating)} />
        <StatCard label="Total dishes" value={String(analytics.dishes.length)} />
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-bold text-bg-dark">Top performing</h2>
          <p className="text-xs text-text-muted">Highest rated dishes</p>
          <div className="mt-4 space-y-3">
            {analytics.topDishes.length === 0 ? (
              <p className="text-sm text-text-muted">No reviewed dishes yet</p>
            ) : (
              analytics.topDishes.map((dish, i) => (
                <DishRankRow key={dish.dishId} rank={i + 1} dish={dish} />
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-bg-dark">Needs attention</h2>
          <p className="text-xs text-text-muted">Lowest rated dishes</p>
          <div className="mt-4 space-y-3">
            {analytics.bottomDishes.length === 0 ? (
              <p className="text-sm text-text-muted">Not enough data</p>
            ) : (
              analytics.bottomDishes.map((dish, i) => (
                <DishRankRow key={dish.dishId} rank={analytics.dishes.length - i} dish={dish} variant="warn" />
              ))
            )}
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-text-muted">
        Last updated: {new Date(analytics.computedAt).toLocaleString()}
      </p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-bg-dark">{value}</p>
    </div>
  )
}

interface DishRankRowProps {
  rank: number
  dish: { dishId: string; dishName: string; avgOverall: number; reviewCount: number }
  variant?: 'default' | 'warn'
}

function DishRankRow({ rank, dish, variant = 'default' }: DishRankRowProps) {
  const ratingColor = variant === 'warn' ? 'text-[var(--color-accent)]' : 'text-primary-dark'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-cream text-xs font-bold text-text-secondary">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-bg-dark">{dish.dishName}</p>
        <p className="text-xs text-text-muted">{dish.reviewCount} reviews</p>
      </div>
      <span className={`text-sm font-bold ${ratingColor}`}>
        {formatRating(dish.avgOverall)}
      </span>
    </div>
  )
}
