import type { User, UserProfileUpdate } from '@/lib/types'

export interface UserRepository {
  getById(id: string): Promise<User | null>
  createFromAuthUser(user: { id: string; displayName?: string | null; email?: string | null; avatarUrl?: string | null }): Promise<User | null>
  update(id: string, updates: UserProfileUpdate): Promise<boolean>
  getReviewCount(id: string): Promise<number>
  list(limit?: number): Promise<User[]>
  toggleAdmin(userId: string, isAdmin: boolean): Promise<boolean>
  togglePremium(userId: string, isPremium: boolean): Promise<boolean>
}
