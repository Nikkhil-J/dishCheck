import { createUser, getUser, getUserReviewCount, updateUser } from '@/lib/firebase/users'
import { getUsers, toggleAdmin, togglePremium } from '@/lib/firebase/admin'
import type { UserRepository } from '@/lib/repositories/userRepository'
import type { User, UserProfileUpdate } from '@/lib/types'
import { mapUser } from './mappers'
import { sendWelcomeEmail } from '@/lib/services/email'
import { captureError } from '@/lib/monitoring/sentry'

export class FirebaseUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    const user = await getUser(id)
    return user ? mapUser(user) : null
  }

  async createFromAuthUser(user: { id: string; displayName?: string | null; email?: string | null; avatarUrl?: string | null }): Promise<User | null> {
    const created = await createUser({
      uid: user.id,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.avatarUrl ?? null,
    } as Parameters<typeof createUser>[0])

    if (created && user.email) {
      sendWelcomeEmail({
        email: user.email,
        displayName: user.displayName ?? 'Foodie',
      }).catch((err) => captureError(err, { extra: { phase: 'welcome-email' } }))
    }

    return created ? mapUser(created) : null
  }

  update(id: string, updates: UserProfileUpdate): Promise<boolean> {
    return updateUser(id, updates)
  }

  getReviewCount(id: string): Promise<number> {
    return getUserReviewCount(id)
  }

  async list(limit?: number): Promise<User[]> {
    const users = await getUsers(limit)
    return users.map(mapUser)
  }

  toggleAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
    return toggleAdmin(userId, isAdmin)
  }

  togglePremium(userId: string, isPremium: boolean): Promise<boolean> {
    return togglePremium(userId, isPremium)
  }
}
