import type { Client } from 'typesense'
import type { SearchResponseHit } from 'typesense/lib/Typesense/Documents'
import type { RestaurantSearchRepository, GetRestaurantsParams } from '@/lib/repositories/restaurantSearchRepository'
import type { PaginatedData } from '@/lib/repositories/dishRepository'
import type { Restaurant } from '@/lib/types'
import { captureError } from '@/lib/monitoring/sentry'

const COLLECTION_NAME = 'restaurants'
const DEFAULT_PAGE_SIZE = 20

interface TypesenseRestaurantDoc {
  id: string
  name: string
  nameLower: string
  city: string
  area: string
  cuisines: string[]
  coverImage: string
  dishNames: string[]
  dishCount: number
  totalReviews: number
  isActive: boolean
  createdAt: number
}

function hitToRestaurant(hit: SearchResponseHit<TypesenseRestaurantDoc>): Restaurant {
  const d = hit.document
  return {
    id: d.id,
    name: d.name,
    city: d.city,
    area: d.area,
    address: '',
    cuisines: d.cuisines ?? [],
    googlePlaceId: null,
    coordinates: { lat: 0, lng: 0 },
    coverImage: d.coverImage || null,
    phoneNumber: null,
    website: null,
    googleMapsUrl: null,
    googleRating: null,
    ownerId: null,
    isVerified: false,
    isActive: d.isActive ?? true,
    createdAt: d.createdAt
      ? new Date(d.createdAt * 1000).toISOString()
      : new Date(0).toISOString(),
  }
}

function buildSortBy(sortBy?: string): string {
  switch (sortBy) {
    case 'most-reviewed':
      return 'totalReviews:desc'
    case 'newest':
      return 'createdAt:desc'
    case 'alphabetical':
      return 'name:asc'
    default:
      return '_text_match:desc,totalReviews:desc'
  }
}

function buildFilterBy(params: GetRestaurantsParams): string {
  const filters: string[] = ['isActive:true']

  if (params.city) {
    filters.push(`city:=${params.city}`)
  }
  if (params.cuisine) {
    filters.push(`cuisines:=[${params.cuisine}]`)
  }
  if (params.area) {
    filters.push(`area:=${params.area}`)
  }

  return filters.join(' && ')
}

export class TypesenseRestaurantRepository implements RestaurantSearchRepository {
  private readonly searchTsClient: Client

  constructor(
    private readonly tsClient: Client,
    private readonly fallback: RestaurantSearchRepository,
    searchTsClient?: Client,
  ) {
    this.searchTsClient = searchTsClient ?? tsClient
  }

  async search(params: GetRestaurantsParams): Promise<PaginatedData<Restaurant>> {
    try {
      const pageSize = params.limit ?? DEFAULT_PAGE_SIZE
      const page = params.cursor ? Number(params.cursor) : 1

      const result = await this.searchTsClient
        .collections<TypesenseRestaurantDoc>(COLLECTION_NAME)
        .documents()
        .search({
          q: params.query || '*',
          query_by: 'name,cuisines,dishNames',
          filter_by: buildFilterBy(params),
          sort_by: buildSortBy(params.sortBy),
          per_page: pageSize + 1,
          page,
          typo_tokens_threshold: 3,
        })

      const hits = result.hits ?? []
      const hasMore = hits.length > pageSize
      const items = (hasMore ? hits.slice(0, pageSize) : hits).map(hitToRestaurant)

      return {
        data: items,
        hasMore,
        nextCursor: hasMore ? String(page + 1) : undefined,
      }
    } catch (e) {
      captureError(e, { route: 'typesense-restaurant-search', extra: { query: params.query } })
      return this.fallback.search(params)
    }
  }
}
