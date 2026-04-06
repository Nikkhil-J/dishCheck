'use client'

import { useEffect, useState } from 'react'
import { getFlaggedReviews, unflagReview } from '@/lib/services/admin'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import type { Review } from '@/lib/types'

export default function AdminReviewsPage() {
  const { user, authUser } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFlaggedReviews()
      .then(setReviews)
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(id: string) {
    if (!authUser) return
    const token = await authUser.getIdToken()
    const success = await unflagReview(id, token)
    if (success) {
      setReviews((prev) => prev.filter((r) => r.id !== id))
    }
  }

  async function handleDelete(review: Review) {
    if (!user || !authUser || !confirm('Delete this review?')) return
    const token = await authUser.getIdToken()
    const res = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-bg-dark">Flagged Reviews</h1>
      <p className="mt-1 text-sm text-text-muted">{reviews.length} flagged</p>

      {reviews.length === 0 ? (
        <div className="mt-8"><EmptyState icon="✅" title="No flagged reviews" description="All reviews are clean." /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-destructive/20 bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-bg-dark">{review.userName}</p>
                  <p className="text-xs text-text-muted">Dish: {review.dishId}</p>
                  {review.text && <p className="mt-1 text-sm text-text-primary">&ldquo;{review.text}&rdquo;</p>}
                  <div className="mt-1 flex gap-2 text-xs text-text-muted">
                    <span>Taste: {review.tasteRating}</span>
                    <span>Portion: {review.portionRating}</span>
                    <span>Value: {review.valueRating}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => handleApprove(review.id)}
                  size="xs"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary-dark"
                >
                  Keep (unflag)
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(review)}
                  size="xs"
                  className="rounded-lg bg-transparent border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
