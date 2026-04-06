import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { searchDishes } from '@/lib/services/dishes'
import { DishCard } from '@/components/features/DishCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CUISINE_TYPES, CUISINE_EMOJI } from '@/lib/constants'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

function slugToName(slug: string): string | null {
  const match = CUISINE_TYPES.find(
    (c) => c.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
  )
  return match ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const name = slugToName(slug)
  if (!name) return { title: 'Cuisine not found — DishCheck' }
  return {
    title: `${name} Dishes — DishCheck`,
    description: `Explore the best ${name} dishes reviewed by real food lovers.`,
  }
}

export default async function CuisinePage({ params }: PageProps) {
  const { slug } = await params
  const cuisineName = slugToName(slug)

  if (!cuisineName) notFound()

  const result = await searchDishes('', {
    cuisine: cuisineName,
    area: null,
    dietary: null,
    priceRange: null,
    minRating: null,
    sortBy: 'highest-rated',
  })

  const dishes = result.items
  const emoji = CUISINE_EMOJI[cuisineName] ?? '🍴'

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      {/* Hero */}
      <div className="py-10 text-center">
        <div className="text-5xl">{emoji}</div>
        <h1 className="mt-4 font-display text-4xl font-bold text-bg-dark">{cuisineName}</h1>
        <div className="mt-4 flex justify-center gap-6">
          <span className="text-sm text-text-secondary">
            <strong className="text-bg-dark">{dishes.length}</strong> dishes
          </span>
        </div>
      </div>

      {/* Dishes */}
      {dishes.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={`No ${cuisineName} dishes yet`}
          description="Be the first to review a dish from this cuisine."
          ctaLabel="Explore all dishes"
          ctaHref="/explore"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  )
}
