import type { Client } from 'typesense'
import type { SearchResponseHit } from 'typesense/lib/Typesense/Documents'
import type { DishRepository, GetDishesParams, PaginatedData } from '@/lib/repositories/dishRepository'
import type { Dish, DietaryType, PriceRange } from '@/lib/types'
import { captureError } from '@/lib/monitoring/sentry'

const COLLECTION_NAME = 'dishes'
const DEFAULT_PAGE_SIZE = 20

interface TypesenseDishDoc {
  id: string
  name: string
  nameLower: string
  restaurantId: string
  restaurantName: string
  city: string
  area: string
  cuisines: string[]
  description: string
  category: string
  dietary: string
  priceRange: string
  coverImage: string
  avgTaste: number
  avgPortion: number
  avgValue: number
  avgOverall: number
  reviewCount: number
  topTags: string[]
  isActive: boolean
  createdAt: number
}

function hitToDish(hit: SearchResponseHit<TypesenseDishDoc>): Dish {
  const d = hit.document
  return {
    id: d.id,
    name: d.name,
    nameLower: d.nameLower,
    restaurantId: d.restaurantId,
    restaurantName: d.restaurantName,
    cuisines: d.cuisines ?? [],
    area: d.area ?? '',
    description: d.description || null,
    category: d.category as Dish['category'],
    dietary: d.dietary as DietaryType,
    priceRange: (d.priceRange || null) as PriceRange | null,
    coverImage: d.coverImage || null,
    avgTaste: d.avgTaste ?? 0,
    avgPortion: d.avgPortion ?? 0,
    avgValue: d.avgValue ?? 0,
    avgOverall: d.avgOverall ?? 0,
    reviewCount: d.reviewCount ?? 0,
    topTags: d.topTags ?? [],
    isActive: d.isActive ?? true,
    createdAt: d.createdAt
      ? new Date(d.createdAt * 1000).toISOString()
      : new Date(0).toISOString(),
  }
}

function buildSortBy(sortBy?: string): string {
  switch (sortBy) {
    case 'highest-rated':
      return 'avgOverall:desc'
    case 'most-helpful':
      return 'reviewCount:desc'
    case 'newest':
      return 'createdAt:desc'
    default:
      return '_text_match:desc,avgOverall:desc'
  }
}

function buildFilterBy(params: GetDishesParams): string {
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
  if (params.dietary) {
    filters.push(`dietary:=${params.dietary}`)
  }
  if (params.priceRange) {
    filters.push(`priceRange:=${params.priceRange}`)
  }

  return filters.join(' && ')
}

/**
 * DishRepository implementation that delegates search() to Typesense for
 * typo-tolerant full-text search. All other methods delegate to the provided
 * Firestore-backed fallback repository.
 *
 * Accepts an optional search-only client (least-privilege) that is used for
 * read queries. The admin client is kept for any future write operations.
 */
export class TypesenseDishRepository implements DishRepository {
  private readonly searchTsClient: Client

  constructor(
    private readonly tsClient: Client,
    private readonly fallback: DishRepository,
    searchTsClient?: Client,
  ) {
    this.searchTsClient = searchTsClient ?? tsClient
  }

  getById(id: string) {
    return this.fallback.getById(id)
  }

  getCount() {
    return this.fallback.getCount()
  }

  getByRestaurant(restaurantId: string) {
    return this.fallback.getByRestaurant(restaurantId)
  }

  getTop(limit?: number, city?: string | null) {
    return this.fallback.getTop(limit, city)
  }

  compare(id1: string, id2: string) {
    return this.fallback.compare(id1, id2)
  }

  async search(params: GetDishesParams): Promise<PaginatedData<Dish>> {
    try {
      const pageSize = params.limit ?? DEFAULT_PAGE_SIZE
      const page = params.cursor ? Number(params.cursor) : 1

      const result = await this.searchTsClient
        .collections<TypesenseDishDoc>(COLLECTION_NAME)
        .documents()
        .search({
          q: params.query || '*',
          query_by: 'name,restaurantName,cuisines,topTags',
          filter_by: buildFilterBy(params),
          sort_by: buildSortBy(params.sortBy),
          per_page: pageSize + 1,
          page,
          typo_tokens_threshold: 3,
        })

      const hits = result.hits ?? []
      const hasMore = hits.length > pageSize
      const items = (hasMore ? hits.slice(0, pageSize) : hits).map(hitToDish)

      return {
        data: items,
        hasMore,
        nextCursor: hasMore ? String(page + 1) : undefined,
      }
    } catch (e) {
      captureError(e, { route: 'typesense-search', extra: { query: params.query } })
      return this.fallback.search(params)
    }
  }
}
