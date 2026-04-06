import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Notification } from '../types'
import { FIRESTORE_BATCH_LIMIT } from '../constants'
import { logError } from '../logger'

/** Returns a single notification by ID, or null if not found. */
export async function getNotification(notificationId: string): Promise<Notification | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Notification
  } catch (e) {
    logError('getNotification', e)
    return null
  }
}

/** Returns notifications for a user, newest first. */
export async function getNotifications(
  userId: string,
  limitCount = 50
): Promise<Notification[]> {
  try {
    const ref = collection(db, COLLECTIONS.NOTIFICATIONS)
    const snap = await getDocs(
      query(
        ref,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification)
  } catch (e) {
    logError('getNotifications', e)
    return []
  }
}

/** Marks all unread notifications as read, respecting Firestore's 500-op batch limit. */
export async function markAllRead(userId: string): Promise<boolean> {
  try {
    const ref = collection(db, COLLECTIONS.NOTIFICATIONS)
    const snap = await getDocs(
      query(ref, where('userId', '==', userId), where('isRead', '==', false))
    )

    if (snap.empty) return true

    const docs = snap.docs
    for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT)
      const batch = writeBatch(db)
      for (const d of chunk) {
        batch.update(d.ref, { isRead: true })
      }
      await batch.commit()
    }

    return true
  } catch (e) {
    logError('markAllRead', e)
    return false
  }
}

/** Marks a single notification as read. */
export async function markRead(notificationId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), { isRead: true })
    return true
  } catch (e) {
    logError('markRead', e)
    return false
  }
}

