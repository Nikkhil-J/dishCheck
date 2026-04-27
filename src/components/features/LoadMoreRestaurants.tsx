'use client'

import { useState, useTransition } from 'react'
import { RestaurantCard } from '@/components/features/RestaurantCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import type { Restaurant } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'
import { API_ENDPOINTS } from '@/lib/constants/api'

interface LoadMoreRestaurantsProps {
  initialRestaurants: Restaurant[]
  initialHasMore: boolean
  initialCursorId?: string | null
  filters: {
    city?: string | null
    cuisine?: string | null
    area?: string | null
    sortBy?: string | null
  }
  query: string
}

interface RestaurantsApiResult {
  items: Restaurant[]
  hasMore: boolean
  nextCursorId: string | null
}

export function LoadMoreRestaurants({
  initialRestaurants,
  initialHasMore,
  initialCursorId = null,
  filters,
  query,
}: LoadMoreRestaurantsProps) {
  const { authUser } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursorId, setNextCursorId] = useState<string | null>(initialCursorId)
  const [isPending, startTransition] = useTransition()

  async function loadMore() {
    startTransition(async () => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (filters.city) params.set('city', filters.city)
      if (filters.cuisine) params.set('cuisine', filters.cuisine)
      if (filters.area) params.set('area', filters.area)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (nextCursorId) params.set('cursor', nextCursorId)

      const token = authUser ? await authUser.getIdToken() : null
      const res = await fetch(`${API_ENDPOINTS.RESTAURANTS}?${params.toString()}`, {
        cache: 'no-store',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return

      const result = (await res.json()) as RestaurantsApiResult
      const newItems = result.items.filter(
        (r) => !restaurants.some((existing) => existing.id === r.id)
      )
      setRestaurants((prev) => [...prev, ...newItems])
      setNextCursorId(result.nextCursorId)
      setHasMore(result.hasMore)
    })
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {restaurants.map((restaurant, i) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} index={i} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
            className="h-auto gap-2 rounded-pill border-2 border-border px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-primary hover:bg-transparent hover:text-primary"
          >
            {isPending ? <LoadingSpinner size="sm" /> : 'Load more restaurants'}
          </Button>
        </div>
      )}
    </>
  )
}
