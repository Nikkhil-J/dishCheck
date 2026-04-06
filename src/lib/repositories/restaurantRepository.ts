import type { Restaurant } from '@/lib/types'

export interface RestaurantRepository {
  getById(id: string): Promise<Restaurant | null>
  getAll(city?: string, limit?: number): Promise<Restaurant[]>
  getByArea(area: string): Promise<Restaurant[]>
  getCount(city?: string): Promise<number>
}
