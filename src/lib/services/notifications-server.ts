import 'server-only'

import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import type { NotificationType } from '@/lib/types'
import { logError } from '@/lib/logger'

/**
 * Creates a notification using the admin SDK. Server-only — never call from client.
 * Fire-and-forget: failures are logged but never propagated to the caller.
 */
export async function createServerNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl: string | null = null
): Promise<void> {
  try {
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId,
      type,
      title,
      message,
      linkUrl,
      isRead: false,
      createdAt: Timestamp.now(),
    })
  } catch (e) {
    logError('createServerNotification', e)
  }
}

/**
 * Returns the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const snap = await adminDb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .count()
      .get()
    return snap.data().count
  } catch (e) {
    logError('getUnreadCount', e)
    return 0
  }
}
