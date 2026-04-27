import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { searchDishes } from '@/lib/services/dishes'
import { DishCard } from '@/components/features/DishCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CUISINE_TYPES, CUISINE_EMOJI, SORT_OPTIONS } from '@/lib/constants'
import { MobileBackButton } from '@/components/ui/MobileBackButton'
import { ROUTES } from '@/lib/constants/routes'

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
  if (!name) return { title: 'Cuisine not found — Cravia' }
  return {
    title: `${name} Dishes — Cravia`,
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
    sortBy: SORT_OPTIONS.HIGHEST_RATED,
  })

  const dishes = result.items
  const emoji = CUISINE_EMOJI[cuisineName] ?? '🍴'

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <MobileBackButton />
      {/* Hero */}
      <div className="py-6 text-center sm:py-10">
        <div className="text-4xl sm:text-5xl">{emoji}</div>
        <h1 className="mt-3 font-display text-2xl font-bold text-heading sm:mt-4 sm:text-4xl">{cuisineName}</h1>
        <div className="mt-3 flex justify-center gap-6 sm:mt-4">
          <span className="text-sm text-text-secondary">
            <strong className="text-heading">{dishes.length}</strong> dishes
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
          ctaHref={ROUTES.EXPLORE}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  )
}
