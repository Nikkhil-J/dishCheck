import { addToWishlist, getWishlist, isInWishlist, removeFromWishlist } from '@/lib/firebase/wishlist'
import type { WishlistRepository } from '@/lib/repositories/wishlistRepository'
import type { Dish, WishlistItem } from '@/lib/types'
import { mapWishlistItem } from './mappers'

export class FirebaseWishlistRepository implements WishlistRepository {
  async getByUser(userId: string): Promise<WishlistItem[]> {
    const items = await getWishlist(userId)
    return items.map(mapWishlistItem)
  }

  add(userId: string, dish: Dish): Promise<boolean> {
    return addToWishlist(userId, dish)
  }

  remove(userId: string, dishId: string): Promise<boolean> {
    return removeFromWishlist(userId, dishId)
  }

  has(userId: string, dishId: string): Promise<boolean> {
    return isInWishlist(userId, dishId)
  }
}
