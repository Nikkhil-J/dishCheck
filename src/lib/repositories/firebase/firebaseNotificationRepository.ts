import { getNotification, getNotifications, markAllRead, markRead } from '@/lib/firebase/notifications'
import type { NotificationRepository } from '@/lib/repositories/notificationRepository'
import type { Notification } from '@/lib/types'
import { mapNotification } from './mappers'

export class FirebaseNotificationRepository implements NotificationRepository {
  async getById(notificationId: string): Promise<Notification | null> {
    const notification = await getNotification(notificationId)
    return notification ? mapNotification(notification) : null
  }

  async getByUser(userId: string, limit?: number): Promise<Notification[]> {
    const notifications = await getNotifications(userId, limit)
    return notifications.map(mapNotification)
  }

  markAllRead(userId: string): Promise<boolean> {
    return markAllRead(userId)
  }

  markRead(notificationId: string): Promise<boolean> {
    return markRead(notificationId)
  }
}
