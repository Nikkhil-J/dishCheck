import { useQuery } from '@tanstack/react-query'
import { getReviewsByUser } from '@/lib/firebase/reviews'
import { useAuth } from './useAuth'

export function useMyReviews() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => getReviewsByUser(user!.id),
    enabled: !!user,
    select: (data) => data.items,
  })
}
