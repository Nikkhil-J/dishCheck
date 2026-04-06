import type { Notification } from '@/lib/types'

export interface NotificationRepository {
  getById(notificationId: string): Promise<Notification | null>
  getByUser(userId: string, limit?: number): Promise<Notification[]>
  markAllRead(userId: string): Promise<boolean>
  markRead(notificationId: string): Promise<boolean>
}
