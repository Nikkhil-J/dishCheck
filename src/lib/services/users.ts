import { userRepository } from '@/lib/repositories'
import type { UserProfileUpdate } from '@/lib/types'

export function getUser(id: string) {
  return userRepository.getById(id)
}

export function updateUser(id: string, updates: UserProfileUpdate) {
  return userRepository.update(id, updates)
}

