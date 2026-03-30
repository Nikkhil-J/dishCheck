import { useQuery } from '@tanstack/react-query'
import { getDish } from '@/lib/firebase/dishes'

export function useDish(id: string) {
  return useQuery({
    queryKey: ['dish', id],
    queryFn: () => getDish(id),
    enabled: !!id,
  })
}
