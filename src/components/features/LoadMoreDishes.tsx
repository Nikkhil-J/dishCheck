'use client'

import { useState, useTransition } from 'react'
import { DishCard } from '@/components/features/DishCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import type { Dish, SearchFilters } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'

interface LoadMoreDishesProps {
  initialDishes: Dish[]
  initialHasMore: boolean
  initialCursorId?: string | null
  filters: Partial<SearchFilters> & { city?: string | null }
  query: string
}

interface DishesApiResult {
  items: Dish[]
  hasMore: boolean
  nextCursorId: string | null
}

export function LoadMoreDishes({
  initialDishes,
  initialHasMore,
  initialCursorId = null,
  filters,
  query,
}: LoadMoreDishesProps) {
  const { authUser } = useAuth()
  const [dishes, setDishes] = useState<Dish[]>(initialDishes)
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
      if (filters.dietary) params.set('dietary', filters.dietary)
      if (filters.priceRange) params.set('priceRange', filters.priceRange)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (nextCursorId) params.set('cursor', nextCursorId)

      const token = authUser ? await authUser.getIdToken() : null
      const res = await fetch(`/api/dishes?${params.toString()}`, {
        cache: 'no-store',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return

      const result = (await res.json()) as DishesApiResult
      const newItems = result.items.filter((d) => !dishes.some((existing) => existing.id === d.id))
      setDishes((prev) => [...prev, ...newItems])
      setNextCursorId(result.nextCursorId)
      setHasMore(result.hasMore)
    })
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dishes.map((dish, i) => (
          <DishCard key={dish.id} dish={dish} index={i} />
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
            {isPending ? <LoadingSpinner size="sm" /> : 'Load more dishes'}
          </Button>
        </div>
      )}
    </>
  )
}
