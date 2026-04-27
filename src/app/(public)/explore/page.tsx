import { Suspense } from 'react'
import type { Metadata } from 'next'
import { searchRestaurants } from '@/lib/services/catalog'
import type { RestaurantSortOption } from '@/lib/services/catalog'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadMoreRestaurants } from '@/components/features/LoadMoreRestaurants'
import { ExploreResultsWrapper } from '@/components/features/ExploreResultsWrapper'
import { ExploreEntranceWrapper } from '@/components/features/ExploreEntranceWrapper'
import { CUISINE_TYPES } from '@/lib/constants'
import { listCityAreas, resolveCity } from '@/lib/services/city'
import { getCityFromCookie } from '@/lib/utils/get-city-from-cookie'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { SearchBar } from '@/components/features/SearchBar'
import { ROUTES } from '@/lib/constants/routes'
import { ExploreFilters } from './explore-filters'

export const metadata: Metadata = {
  title: 'Explore Restaurants — Cravia',
  description: 'Explore restaurants across Bengaluru and Gurugram. Find the best dishes reviewed by real diners.',
}

const VALID_SORT: RestaurantSortOption[] = ['most-reviewed', 'newest', 'alphabetical']

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string
    cuisine?: string
    area?: string
    sortBy?: string
  }>
}

function ResultsSkeleton() {
  return (
    <div className="mt-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-border" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
  sortBy,
}: {
  query: string
  city: string | null
  area: string | null
  cuisine: string | null
  sortBy: RestaurantSortOption
}) {
  const result = await searchRestaurants({ query, city, area, cuisine, sortBy })
  const restaurants = result.items

  const filterPayload = { city, cuisine, area, sortBy }

  return (
    <div className="mt-6">
      <p className="mb-4 text-sm text-text-muted">
        {restaurants.length}{result.hasMore ? '+' : ''} result{restaurants.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
      </p>

      {restaurants.length === 0 ? (
        <EmptyState
          icon="🏪"
          title={query ? `No restaurants found for "${query}"` : 'No restaurants found'}
          description="Try adjusting your filters or search term."
          ctaLabel="Clear filters"
          ctaHref={ROUTES.EXPLORE}
        />
      ) : (
        <LoadMoreRestaurants
          initialRestaurants={restaurants}
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
  const sortBy = (VALID_SORT.includes(params.sortBy as RestaurantSortOption)
    ? params.sortBy as RestaurantSortOption
    : 'most-reviewed') as RestaurantSortOption

  const resolvedCity = resolveCity({ requestedCity: city })
  const areas = listCityAreas(resolvedCity)
  const paramsKey = JSON.stringify(params)

  return (
    <ExploreEntranceWrapper>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 md:hidden">
          <Suspense fallback={<div className="h-[44px] animate-pulse rounded-pill bg-border" />}>
            <SearchBar
              variant="navbar"
              initialQuery={query}
              className="block w-full max-w-none"
            />
          </Suspense>
        </div>

        <ExploreFilters
          query={query}
          selectedCuisine={cuisine}
          selectedArea={area}
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
              sortBy={sortBy}
            />
          </ExploreResultsWrapper>
        </Suspense>
      </div>
    </ExploreEntranceWrapper>
  )
}
