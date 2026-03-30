import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import { getDish } from '@/lib/firebase/dishes'
import { ReviewCard } from '@/components/features/ReviewCard'
import type { Review } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const snap = await getDoc(doc(db, COLLECTIONS.REVIEWS, id))
  if (!snap.exists()) return { title: 'Review not found — DishCheck' }
  const review = { id: snap.id, ...snap.data() } as Review
  const dish = await getDish(review.dishId)
  return {
    title: `Review of ${dish?.name ?? 'dish'} at ${dish?.restaurantName ?? 'restaurant'} by ${review.userName} — DishCheck`,
  }
}

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params
  const snap = await getDoc(doc(db, COLLECTIONS.REVIEWS, id))
  if (!snap.exists()) notFound()

  const review = { id: snap.id, ...snap.data() } as Review
  const dish = await getDish(review.dishId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {dish && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{dish.name}</h1>
          <p className="text-sm text-gray-500">{dish.restaurantName}</p>
        </div>
      )}
      <ReviewCard review={review} />
    </div>
  )
}
