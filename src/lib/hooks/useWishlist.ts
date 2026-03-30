import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/firebase/wishlist'
import { useAuth } from './useAuth'
import type { Dish } from '@/lib/types'

export function useWishlist() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => getWishlist(user!.id),
    enabled: !!user,
  })
}

export function useAddToWishlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dish: Dish) => addToWishlist(user!.id, dish),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist', user?.id] }),
  })
}

export function useRemoveFromWishlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dishId: string) => removeFromWishlist(user!.id, dishId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist', user?.id] }),
  })
}
