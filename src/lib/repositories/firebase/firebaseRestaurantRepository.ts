import { getAllRestaurants, getRestaurant, getRestaurantsByArea, getRestaurantCount } from '@/lib/firebase/restaurants'
import type { RestaurantRepository } from '@/lib/repositories/restaurantRepository'
import type { Restaurant } from '@/lib/types'
import { mapRestaurant } from './mappers'

export class FirebaseRestaurantRepository implements RestaurantRepository {
  async getById(id: string): Promise<Restaurant | null> {
    const restaurant = await getRestaurant(id)
    return restaurant ? mapRestaurant(restaurant) : null
  }

  async getAll(city?: string, limit?: number): Promise<Restaurant[]> {
    const restaurants = await getAllRestaurants(city, limit)
    return restaurants.map(mapRestaurant)
  }

  async getByArea(area: string): Promise<Restaurant[]> {
    const restaurants = await getRestaurantsByArea(area)
    return restaurants.map(mapRestaurant)
  }

  async getCount(city?: string): Promise<number> {
    return getRestaurantCount(city)
  }
}
