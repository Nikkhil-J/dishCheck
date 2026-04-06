import { useQuery } from '@tanstack/react-query'
import { wishlistRepository } from '@/lib/repositories'
import { useAuth } from './useAuth'

/**
 * Read-only hook for fetching the user's wishlist.
 * All wishlist writes go through /api/users/[userId]/wishlist/* routes.
 */
export function useWishlist() {
  const { user } = useAuth()
  const userId = user?.id
  return useQuery({
    queryKey: ['wishlist', userId],
    queryFn: () => wishlistRepository.getByUser(userId!),
    enabled: !!userId,
  })
}
