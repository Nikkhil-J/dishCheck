'use client'

import { useState, useTransition } from 'react'
import { ReviewCard } from '@/components/features/ReviewCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Review } from '@/lib/types'

interface LoadMoreReviewsProps {
  initialReviews: Review[]
  initialHasMore: boolean
  initialCursorId?: string | null
  dishId: string
  currentUserId?: string
}

interface DishReviewsApiResult {
  items: Review[]
  hasMore: boolean
  nextCursorId: string | null
}

export function LoadMoreReviews({
  initialReviews,
  initialHasMore,
  initialCursorId = null,
  dishId,
  currentUserId: externalUserId,
}: LoadMoreReviewsProps) {
  const { user } = useAuth()
  const currentUserId = externalUserId ?? user?.id
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursorId, setNextCursorId] = useState<string | null>(initialCursorId)
  const [isPending, startTransition] = useTransition()

  async function loadMore() {
    startTransition(async () => {
      const params = new URLSearchParams()
      if (nextCursorId) params.set('cursor', nextCursorId)
      const qs = params.toString()
      const res = await fetch(`/api/dishes/${encodeURIComponent(dishId)}/reviews${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
      if (!res.ok) return

      const result = (await res.json()) as DishReviewsApiResult
      const newItems = result.items.filter((r) => !reviews.some((existing) => existing.id === r.id))
      setReviews((prev) => [...prev, ...newItems])
      setNextCursorId(result.nextCursorId)
      setHasMore(result.hasMore)
    })
  }

  return (
    <>
      <div className="mt-5 space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} currentUserId={currentUserId} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
            className="h-auto gap-2 rounded-pill border-2 border-border px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-primary hover:bg-transparent hover:text-primary"
          >
            {isPending ? <LoadingSpinner size="sm" /> : 'Load more reviews'}
          </Button>
        </div>
      )}
    </>
  )
}
