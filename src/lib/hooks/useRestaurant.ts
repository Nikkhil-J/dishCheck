import { useQuery } from '@tanstack/react-query'
import { getRestaurant } from '@/lib/firebase/restaurants'
import { getDishesByRestaurant } from '@/lib/firebase/dishes'

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurant(id),
    enabled: !!id,
  })
}

export function useRestaurantDishes(restaurantId: string) {
  return useQuery({
    queryKey: ['restaurant-dishes', restaurantId],
    queryFn: () => getDishesByRestaurant(restaurantId),
    enabled: !!restaurantId,
  })
}
