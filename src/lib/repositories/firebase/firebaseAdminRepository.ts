import { getAdminStats } from '@/lib/firebase/admin'
import type { AdminRepository } from '@/lib/repositories/adminRepository'
import type { AdminStats } from '@/lib/types'

export class FirebaseAdminRepository implements AdminRepository {
  getStats(): Promise<AdminStats | null> {
    return getAdminStats()
  }
}
