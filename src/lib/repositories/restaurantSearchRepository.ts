import type { Restaurant } from '@/lib/types'
import type { PaginatedData } from './dishRepository'

export interface GetRestaurantsParams {
  query?: string
  city?: string | null
  area?: string | null
  cuisine?: string | null
  sortBy?: 'most-reviewed' | 'newest' | 'alphabetical'
  limit?: number
  cursor?: string
}

export interface RestaurantSearchRepository {
  search(params: GetRestaurantsParams): Promise<PaginatedData<Restaurant>>
}
