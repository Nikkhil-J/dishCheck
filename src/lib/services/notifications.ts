import { notificationRepository } from '@/lib/repositories'

export function getNotifications(userId: string, limit?: number) {
  return notificationRepository.getByUser(userId, limit)
}

