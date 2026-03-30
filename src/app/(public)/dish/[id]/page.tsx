import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getDish } from '@/lib/firebase/dishes'
import { getReviewsByDish } from '@/lib/firebase/reviews'
import { ReviewCard } from '@/components/features/ReviewCard'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { TagCloud } from '@/components/ui/TagCloud'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRating } from '@/lib/utils/index'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const dish = await getDish(id)
  if (!dish) return { title: 'Dish not found — DishCheck' }
  return {
    title: `${dish.name} at ${dish.restaurantName} — DishCheck`,
    description: `${dish.reviewCount} reviews. Rated ${formatRating(dish.avgOverall)}/5. ${dish.topTags.slice(0, 2).join(', ')}.`,
  }
}

const DIETARY_STYLE: Record<string, string> = {
  veg: 'bg-green-100 text-green-700',
  'non-veg': 'bg-red-100 text-red-700',
  egg: 'bg-yellow-100 text-yellow-700',
}

const PRICE_LABEL: Record<string, string> = {
  'under-100': '< ₹100',
  '100-200': '₹100–200',
  '200-400': '₹200–400',
  '400-600': '₹400–600',
  'above-600': '> ₹600',
}

export default async function DishPage({ params }: PageProps) {
  const { id } = await params
  const [dish, reviewsResult] = await Promise.all([
    getDish(id),
    getReviewsByDish(id),
  ])

  if (!dish) notFound()

  const reviews = reviewsResult.items

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-gray-100">
        {dish.coverImage ? (
          <Image src={dish.coverImage} alt={dish.name} fill className="object-cover" priority />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl text-gray-300">🍽️</div>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{dish.name}</h1>
            <span className={`mt-1 rounded-full px-3 py-1 text-sm font-medium ${DIETARY_STYLE[dish.dietary] ?? 'bg-gray-100 text-gray-600'}`}>
              {dish.dietary}
            </span>
          </div>
          <Link href={`/restaurant/${dish.restaurantId}`} className="mt-1 text-brand hover:underline">
            {dish.restaurantName}
          </Link>
          {dish.priceRange && (
            <p className="mt-1 text-sm text-gray-500">{PRICE_LABEL[dish.priceRange]}</p>
          )}
          {dish.description && (
            <p className="mt-3 text-gray-600">{dish.description}</p>
          )}

          {/* Tags */}
          {dish.topTags.length > 0 && (
            <div className="mt-4">
              <TagCloud tags={dish.topTags} maxVisible={8} />
            </div>
          )}

          {/* Write review CTA */}
          <div className="mt-6">
            <Link
              href={`/write-review?dishId=${dish.id}&restaurantId=${dish.restaurantId}`}
              className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Write a Review
            </Link>
          </div>

          {/* Reviews */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900">Reviews ({dish.reviewCount})</h2>
            {reviews.length === 0 ? (
              <EmptyState
                icon="✍️"
                title="Be the first to review this dish"
                description="Share your experience to help others decide."
              />
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <button className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
              Something wrong? Suggest a correction
            </button>
          </div>
        </div>

        {/* Sidebar: rating summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">{formatRating(dish.avgOverall)}</div>
              <div className="mt-1 text-sm text-gray-500">{dish.reviewCount} reviews</div>
            </div>
            <div className="mt-4 space-y-3">
              <SubRatingBar label="Taste" value={dish.avgTaste} />
              <SubRatingBar label="Portion" value={dish.avgPortion} />
              <SubRatingBar label="Value" value={dish.avgValue} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
