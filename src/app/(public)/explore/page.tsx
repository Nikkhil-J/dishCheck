import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listDishes } from '@/lib/services/catalog'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadMoreDishes } from '@/components/features/LoadMoreDishes'
import { ExploreResultsWrapper } from '@/components/features/ExploreResultsWrapper'
import { ExploreEntranceWrapper } from '@/components/features/ExploreEntranceWrapper'
import { CUISINE_TYPES } from '@/lib/constants'
import { listCityAreas, resolveCity } from '@/lib/services/city'
import { getCityFromCookie } from '@/lib/utils/get-city-from-cookie'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import type { DietaryType, PriceRange } from '@/lib/types'
import { ExploreFilters } from './explore-filters'

export const metadata: Metadata = {
  title: 'Explore Dishes — DishCheck',
  description: 'Explore dishes from restaurants across Bengaluru and Gurugram.',
}

type SortOption = 'highest-rated' | 'newest' | 'most-helpful'

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string
    cuisine?: string
    area?: string
    dietary?: string
    priceRange?: string
    sortBy?: string
  }>
}

function ResultsSkeleton() {
  return (
    <div className="mt-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

async function ExploreResults({
  query,
  city,
  area,
  cuisine,
  dietary,
  priceRange,
  sortBy,
}: {
  query: string
  city: string | null
  area: string | null
  cuisine: string | null
  dietary: DietaryType | null
  priceRange: PriceRange | null
  sortBy: SortOption
}) {
  const result = await listDishes({ query, city, area, cuisine, dietary, priceRange, sortBy })
  const dishes = result.items

  const filterPayload = { city, cuisine, area, dietary, priceRange, minRating: null, sortBy }

  return (
    <div className="mt-6">
      <p className="mb-4 text-sm text-text-muted">
        {dishes.length}{result.hasMore ? '+' : ''} result{dishes.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
      </p>

      {dishes.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={query ? `No dishes found for "${query}"` : 'No dishes found'}
          description="Try adjusting your filters or search term."
          ctaLabel="Clear filters"
          ctaHref="/explore"
        />
      ) : (
        <LoadMoreDishes
          initialDishes={dishes}
          initialHasMore={result.hasMore}
          filters={filterPayload}
          query={query}
          initialCursorId={result.nextCursorId}
        />
      )}
    </div>
  )
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const cuisine = params.cuisine ?? null
  const city = await getCityFromCookie()
  const area = params.area ?? null
  const dietary = (params.dietary as DietaryType) || null
  const priceRange = (params.priceRange as PriceRange) || null
  const sortBy = (['highest-rated', 'newest', 'most-helpful'].includes(params.sortBy ?? '')
    ? params.sortBy as SortOption
    : 'highest-rated') as SortOption

  const resolvedCity = resolveCity({ requestedCity: city })
  const areas = listCityAreas(resolvedCity)
  const paramsKey = JSON.stringify(params)

  return (
    <ExploreEntranceWrapper>
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <ExploreFilters
          query={query}
          selectedCuisine={cuisine}
          selectedArea={area}
          selectedDietary={dietary}
          selectedPriceRange={priceRange}
          selectedSortBy={sortBy}
          cuisines={[...CUISINE_TYPES.slice(0, 12)]}
          areas={[...areas]}
        />

        <Suspense key={paramsKey} fallback={<ResultsSkeleton />}>
          <ExploreResultsWrapper>
            <ExploreResults
              query={query}
              city={city}
              area={area}
              cuisine={cuisine}
              dietary={dietary}
              priceRange={priceRange}
              sortBy={sortBy}
            />
          </ExploreResultsWrapper>
        </Suspense>
      </div>
    </ExploreEntranceWrapper>
  )
}
