import {
  getDish,
  getDishComparison,
  getDishCount,
  getDishSnapshot,
  getDishesByRestaurant,
  getTopDishes,
  searchDishes,
} from '@/lib/firebase/dishes'
import type { DishRepository } from '@/lib/repositories/dishRepository'
import type { GetDishesParams, PaginatedData } from '@/lib/repositories/dishRepository'
import type { Dish } from '@/lib/types'
import { mapDish } from './mappers'

function toCursor(lastDoc: unknown): string | undefined {
  if (!lastDoc) return undefined
  if (typeof lastDoc === 'string') return lastDoc
  if (typeof lastDoc === 'object' && lastDoc !== null && 'id' in lastDoc) {
    const id = (lastDoc as { id?: unknown }).id
    return typeof id === 'string' ? id : undefined
  }
  return undefined
}

export class FirebaseDishRepository implements DishRepository {
  async getById(id: string): Promise<Dish | null> {
    const dish = await getDish(id)
    return dish ? mapDish(dish) : null
  }

  getCount(): Promise<number> {
    return getDishCount()
  }

  async getByRestaurant(restaurantId: string): Promise<Dish[]> {
    const dishes = await getDishesByRestaurant(restaurantId)
    return dishes.map(mapDish)
  }

  async search(params: GetDishesParams): Promise<PaginatedData<Dish>> {
    const cursorSnap = params.cursor ? await getDishSnapshot(params.cursor) : null
    const result = await searchDishes(
      params.query ?? '',
      {
        query: params.query ?? '',
        city: params.city ?? null,
        cuisine: params.cuisine ?? null,
        area: params.area ?? null,
        dietary: params.dietary ?? null,
        priceRange: params.priceRange ?? null,
        minRating: null,
        sortBy: params.sortBy ?? 'highest-rated',
      },
      cursorSnap
    )

    return {
      data: result.items.map(mapDish),
      hasMore: result.hasMore,
      nextCursor: toCursor(result.lastDoc),
    }
  }

  async getTop(limit?: number, city?: string | null): Promise<Dish[]> {
    const dishes = await getTopDishes(limit, city)
    return dishes.map(mapDish)
  }

  async compare(id1: string, id2: string): Promise<[Dish, Dish] | null> {
    const pair = await getDishComparison(id1, id2)
    if (!pair) return null
    return [mapDish(pair[0]), mapDish(pair[1])]
  }
}
