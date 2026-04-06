import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, MapPin, Phone, Globe } from 'lucide-react'
import { getRestaurantDetails, listRestaurantDishes } from '@/lib/services/catalog'
import { DishCard } from '@/components/features/DishCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const restaurant = await getRestaurantDetails(id)
  if (!restaurant) return { title: 'Not found — DishCheck' }
  return {
    title: `${restaurant.name} — DishCheck`,
    description: `Dish reviews for ${restaurant.name} in ${restaurant.area}, ${restaurant.city}.`,
  }
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params
  const [restaurant, dishes] = await Promise.all([
    getRestaurantDetails(id),
    listRestaurantDishes(id),
  ])

  if (!restaurant) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: restaurant.city,
      addressRegion: restaurant.area,
    },
    servesCuisine: restaurant.cuisines,
    ...(restaurant.coverImage ? { image: restaurant.coverImage } : {}),
  }

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <div>
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-r from-bg-cream via-accent-light to-primary-light sm:h-64">
        {restaurant.coverImage && (
          <Image src={restaurant.coverImage} alt={restaurant.name} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Info */}
      <div className="relative -mt-8 rounded-t-xl bg-surface">
        <div className="mx-auto max-w-[1000px] px-6 pt-8">
          <h1 className="font-display text-3xl font-bold text-bg-dark">{restaurant.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {restaurant.cuisines.join(' · ')}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {restaurant.area}, {restaurant.city}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            {restaurant.googleMapsUrl && (
              <a
                href={restaurant.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
              >
                <MapPin size={14} />
                View on Google Maps
              </a>
            )}
            {restaurant.phoneNumber && (
              <a
                href={`tel:${restaurant.phoneNumber}`}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
              >
                <Phone size={14} />
                {restaurant.phoneNumber}
              </a>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
              >
                <Globe size={14} />
                Website
              </a>
            )}
          </div>

          {restaurant.cuisines.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {restaurant.cuisines.map((c) => (
                <span
                  key={c}
                  className="rounded-pill bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {dishes.length > 0 && (
            <div className="mt-6 flex gap-3">
              <Link
                href={`/write-review?dishId=${dishes[0].id}&restaurantId=${restaurant.id}`}
                className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Review a Dish
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 flex gap-0 overflow-hidden rounded-lg bg-bg-cream">
            {[
              { num: dishes.length, label: 'Dishes reviewed' },
              { num: dishes.reduce((sum, d) => sum + d.reviewCount, 0), label: 'Total reviews' },
            ].map((s) => (
              <div key={s.label} className="flex-1 py-4 text-center">
                <div className="font-display text-xl font-bold text-bg-dark">{s.num}</div>
                <div className="text-xs text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Dishes */}
          <div className="mt-10 pb-12">
            <h2 className="font-display text-xl font-bold text-bg-dark">
              Popular Dishes
            </h2>
            {dishes.length === 0 ? (
              <EmptyState
                icon="🍽️"
                title="No dishes yet"
                description="Be the first to add a dish review for this restaurant."
              />
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dishes.map((dish, i) => (
                  <DishCard key={dish.id} dish={dish} index={i} />
                ))}
              </div>
            )}
          </div>

          {!restaurant.ownerId && (
            <div className="mt-8 rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-text-muted">
                Is this your restaurant?
              </p>
              <Link
                href={`/claim-restaurant/${restaurant.id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Building2 size={14} />
                Claim this restaurant
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
