'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import { deleteReview } from '@/lib/firebase/reviews'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Review } from '@/lib/types'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, COLLECTIONS.REVIEWS), where('isFlagged', '==', true)))
      .then((snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleApprove(id: string) {
    await updateDoc(doc(db, COLLECTIONS.REVIEWS, id), { isFlagged: false, isApproved: true })
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleDelete(review: Review) {
    if (!confirm('Delete this review?')) return
    await deleteReview(review.id, review.dishId)
    setReviews((prev) => prev.filter((r) => r.id !== review.id))
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Flagged Reviews</h1>
      <p className="mt-1 text-sm text-gray-500">{reviews.length} flagged</p>

      {reviews.length === 0 ? (
        <div className="mt-8"><EmptyState icon="✅" title="No flagged reviews" description="All reviews are clean." /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.userName}</p>
                  <p className="text-xs text-gray-500">Dish: {review.dishId}</p>
                  {review.text && <p className="mt-1 text-sm text-gray-700">&ldquo;{review.text}&rdquo;</p>}
                  <div className="mt-1 flex gap-2 text-xs text-gray-400">
                    <span>Taste: {review.tasteRating}</span>
                    <span>Portion: {review.portionRating}</span>
                    <span>Value: {review.valueRating}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleApprove(review.id)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                >
                  Keep (unflag)
                </button>
                <button
                  onClick={() => handleDelete(review)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
