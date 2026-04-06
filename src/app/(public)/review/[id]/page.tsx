import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDish } from '@/lib/services/dishes'
import { getReview } from '@/lib/services/reviews'
import { ReviewCard } from '@/components/features/ReviewCard'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const review = await getReview(id)
  if (!review) return { title: 'Review not found — DishCheck' }
  const dish = await getDish(review.dishId)
  return {
    title: `Review of ${dish?.name ?? 'dish'} at ${dish?.restaurantName ?? 'restaurant'} by ${review.userName} — DishCheck`,
  }
}

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params
  const review = await getReview(id)
  if (!review) notFound()

  const dish = await getDish(review.dishId)

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {dish && (
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-bg-dark">{dish.name}</h1>
          <p className="text-sm text-text-muted">{dish.restaurantName}</p>
        </div>
      )}
      <ReviewCard review={review} />
    </div>
  )
}
