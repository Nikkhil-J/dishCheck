import { createDishRequest, getPendingRequests } from '@/lib/firebase/dishRequests'
import type { DishRequestRepository } from '@/lib/repositories/dishRequestRepository'
import type { DishRequest, User } from '@/lib/types'
import { mapDishRequest } from './mappers'

export class FirebaseDishRequestRepository implements DishRequestRepository {
  async create(
    data: Pick<DishRequest, 'restaurantId' | 'restaurantName' | 'dishName' | 'description'>,
    user: User
  ): Promise<DishRequest | null> {
    const created = await createDishRequest(data, user)
    return created ? mapDishRequest(created) : null
  }

  async getPending(): Promise<DishRequest[]> {
    const requests = await getPendingRequests()
    return requests.map(mapDishRequest)
  }
}
