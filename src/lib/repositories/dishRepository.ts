import type { Dish, DietaryType, PriceRange } from '@/lib/types'

export interface GetDishesParams {
  query?: string
  city?: string | null
  cuisine?: string | null
  area?: string | null
  dietary?: DietaryType | null
  priceRange?: PriceRange | null
  sortBy?: 'newest' | 'highest-rated' | 'most-helpful'
  limit?: number
  cursor?: string
}

export interface PaginatedData<T> {
  data: T[]
  hasMore: boolean
  nextCursor?: string
}

export interface DishRepository {
  getById(id: string): Promise<Dish | null>
  getCount(): Promise<number>
  getByRestaurant(restaurantId: string): Promise<Dish[]>
  search(params: GetDishesParams): Promise<PaginatedData<Dish>>
  getTop(limit?: number, city?: string | null): Promise<Dish[]>
  compare(id1: string, id2: string): Promise<[Dish, Dish] | null>
}
