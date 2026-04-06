import type { Dish, WishlistItem } from '@/lib/types'

export interface WishlistRepository {
  getByUser(userId: string): Promise<WishlistItem[]>
  add(userId: string, dish: Dish): Promise<boolean>
  remove(userId: string, dishId: string): Promise<boolean>
  has(userId: string, dishId: string): Promise<boolean>
}
