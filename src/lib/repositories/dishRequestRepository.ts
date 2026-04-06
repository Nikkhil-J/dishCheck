import type { DishRequest, User } from '@/lib/types'

export interface DishRequestRepository {
  create(
    data: Pick<DishRequest, 'restaurantId' | 'restaurantName' | 'dishName' | 'description'>,
    user: User
  ): Promise<DishRequest | null>
  getPending(): Promise<DishRequest[]>
}
