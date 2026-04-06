'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { DishSentimentCard } from '@/components/features/DishSentimentCard'
import type { RestaurantAnalytics } from '@/lib/services/restaurant-analytics'

export default function RestaurantDishesPage() {
  const params = useParams<{ restaurantId: string }>()
  const router = useRouter()
  const { authUser } = useAuth()

  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'rating' | 'reviews'>('rating')

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

      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
      setLoading(false)
    }

    load()
  }, [authUser, params.restaurantId, router])

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!analytics) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-lg font-semibold text-bg-dark">Failed to load analytics</p>
      </div>
    )
  }

  const sorted = [...analytics.dishes].sort((a, b) => {
    if (sortBy === 'reviews') return b.reviewCount - a.reviewCount
    return b.avgOverall - a.avgOverall
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/restaurant-dashboard/${params.restaurantId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            &larr; Back to overview
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-bg-dark">
            Per-dish sentiment
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">{analytics.restaurantName}</p>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'reviews')}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary"
        >
          <option value="rating">Sort by rating</option>
          <option value="reviews">Sort by review count</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="📊" title="No dishes yet" description="Once your restaurant has dishes with reviews, sentiment data will appear here." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {sorted.map((dish) => (
            <DishSentimentCard
              key={dish.dishId}
              dish={dish}
              restaurantId={params.restaurantId}
            />
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-text-muted">
        Last updated: {new Date(analytics.computedAt).toLocaleString()}
      </p>
    </div>
  )
}
