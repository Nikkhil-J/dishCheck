import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getDish, getRelatedDishes } from '@/lib/services/dishes'
import { listDishReviews } from '@/lib/services/catalog'
import { DishCard } from '@/components/features/DishCard'
import { LoadMoreReviews } from '@/components/features/LoadMoreReviews'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { TagCloud } from '@/components/ui/TagCloud'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRating } from '@/lib/utils/index'
import { DIETARY_BADGE, PRICE_LABEL } from '@/lib/constants'
import { WishlistButton } from '@/components/features/WishlistButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { cn } from '@/lib/utils'
import { getCuisineEmoji, getCuisineGradient } from '@/lib/utils/dish-display'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const dish = await getDish(id)
  if (!dish) return { title: 'Dish not found — DishCheck' }
  const title = `${dish.name} at ${dish.restaurantName} — DishCheck`
  const description = `${dish.reviewCount} reviews. Rated ${formatRating(dish.avgOverall)}/5. ${dish.topTags.slice(0, 2).join(', ')}.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(dish.coverImage ? { images: [{ url: dish.coverImage, width: 800, height: 600, alt: dish.name }] } : {}),
    },
  }
}

export default async function DishPage({ params }: PageProps) {
  const { id } = await params
  const dish = await getDish(id)
  if (!dish) notFound()

  const relatedDishes = await getRelatedDishes(dish.restaurantId, dish.id, 4)
  const dietaryInfo = dish.dietary ? DIETARY_BADGE[dish.dietary] : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: dish.name,
    description: dish.description || `${dish.name} at ${dish.restaurantName}`,
    ...(dish.coverImage ? { image: dish.coverImage } : {}),
    offers: {
      '@type': 'Offer',
      ...(dish.priceRange ? { priceRange: PRICE_LABEL[dish.priceRange] } : {}),
    },
    aggregateRating: dish.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: dish.avgOverall.toFixed(1),
      bestRating: '5',
      reviewCount: dish.reviewCount,
    } : undefined,
  }

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-text-muted">
        <Link href="/" className="transition-colors hover:text-primary">Home</Link>
        <span>/</span>
        <Link href="/explore" className="transition-colors hover:text-primary">Explore</Link>
        <span>/</span>
        <span className="text-text-primary">{dish.name}</span>
      </nav>

      {/* Hero image */}
      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-bg-cream sm:h-80">
        {dish.coverImage ? (
          <Image src={dish.coverImage} alt={dish.name} fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div className={cn("absolute inset-0", getCuisineGradient(dish.cuisines?.[0]))} />
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 50%, white 1px, transparent 1px),
                                  radial-gradient(circle at 75% 50%, white 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-8xl drop-shadow-sm">
                {getCuisineEmoji(dish.cuisines?.[0])}
              </span>
              <span className="text-sm font-medium text-text-secondary">
                No photo yet — be the first to review
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start gap-3">
            {dietaryInfo && (
              <span className={`rounded-pill border px-3 py-1 text-xs font-semibold ${dietaryInfo.className}`}>
                {dietaryInfo.label}
              </span>
            )}
            {dish.category && (
              <span className="rounded-pill border border-border bg-bg-cream px-3 py-1 text-xs font-medium text-text-secondary">
                {dish.category}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold text-bg-dark sm:text-4xl">{dish.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <Link href={`/restaurant/${dish.restaurantId}`} className="font-medium text-primary hover:underline">
              {dish.restaurantName}
            </Link>
            <span className="flex items-center gap-1 font-bold text-accent">
              ★ {formatRating(dish.avgOverall)}
            </span>
            <span className="text-text-muted">{dish.reviewCount} reviews</span>
            {dish.priceRange && (
              <span className="font-semibold text-bg-dark">{PRICE_LABEL[dish.priceRange]}</span>
            )}
          </div>

          {dish.description && (
            <p className="mt-4 leading-relaxed text-text-secondary">{dish.description}</p>
          )}

          {/* Tags */}
          {dish.topTags.length > 0 && (
            <div className="mt-5">
              <TagCloud tags={dish.topTags} maxVisible={8} />
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/write-review?dishId=${dish.id}&restaurantId=${dish.restaurantId}&from=${encodeURIComponent(`/dish/${dish.id}`)}`}
              className="inline-flex items-center justify-center rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
            >
              Write a Review
            </Link>
            <WishlistButton dishId={dish.id} />
          </div>

          {/* Reviews */}
          <div className="mt-12">
            <h2 className="font-display text-xl font-bold text-bg-dark">
              Reviews ({dish.reviewCount})
            </h2>
            <Suspense fallback={<div className="mt-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}>
              <DishReviewsSection dishId={dish.id} />
            </Suspense>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-center">
                <div className="font-display text-5xl font-bold text-bg-dark">
                  {formatRating(dish.avgOverall)}
                </div>
                <div className="mt-1 text-sm text-text-muted">{dish.reviewCount} reviews</div>
              </div>
              <div className="mt-5 space-y-3">
                <SubRatingBar label="Taste" value={dish.avgTaste} />
                <SubRatingBar label="Portion" value={dish.avgPortion} />
                <SubRatingBar label="Value" value={dish.avgValue} />
              </div>
            </div>

            {/* Restaurant mini-card */}
            <Link
              href={`/restaurant/${dish.restaurantId}`}
              className="block rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm"
            >
              <p className="text-xs font-medium text-text-muted">Restaurant</p>
              <p className="mt-1 font-display font-semibold text-bg-dark">{dish.restaurantName}</p>
              <p className="mt-0.5 text-xs text-primary">View all dishes &rsaquo;</p>
            </Link>
          </div>
        </div>
      </div>

      {relatedDishes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-text-primary">
            More from {dish.restaurantName}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relatedDishes.map((d, i) => (
              <DishCard key={d.id} dish={d} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
    </>
  )
}

async function DishReviewsSection({ dishId }: { dishId: string }) {
  const reviewsResult = await listDishReviews(dishId)

  if (reviewsResult.items.length === 0) {
    return (
      <EmptyState
        icon="✍️"
        title="Be the first to review this dish"
        description="Share your experience to help others decide."
      />
    )
  }

  return (
    <LoadMoreReviews
      initialReviews={reviewsResult.items}
      initialHasMore={reviewsResult.hasMore}
      initialCursorId={reviewsResult.nextCursorId}
      dishId={dishId}
    />
  )
}
