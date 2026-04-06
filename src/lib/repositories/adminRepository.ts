import type { AdminStats } from '@/lib/types'

export interface AdminRepository {
  getStats(): Promise<AdminStats | null>
}
