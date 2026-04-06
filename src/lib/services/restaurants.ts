import { restaurantRepository } from '@/lib/repositories'
import { getAllRestaurantsUnpaginated as getAllRestaurantsUnpaginatedFirebase } from '@/lib/firebase/restaurants'

export function getAllRestaurants(city?: string, limit?: number) {
  return restaurantRepository.getAll(city, limit)
}

export function getAllRestaurantsForSitemap() {
  return getAllRestaurantsUnpaginatedFirebase()
}

export function getRestaurantCount(city?: string) {
  return restaurantRepository.getCount(city)
}

