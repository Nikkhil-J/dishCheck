'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRelativeTime } from '@/lib/utils/index'
import type { Timestamp } from 'firebase/firestore'

interface Notification {
  id: string
  userId: string
  type: 'helpful_vote' | 'badge_earned' | 'review_approved'
  message: string
  isRead: boolean
  createdAt: Timestamp
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const ref = collection(db, COLLECTIONS.NOTIFICATIONS)
    getDocs(query(ref, where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(50)))
      .then((snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.isRead)
    await Promise.all(unread.map((n) => updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), { isRead: true })))
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-brand hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center"><LoadingSpinner /></div>
      ) : notifications.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="🔔" title="No notifications yet" description="You'll be notified about helpful votes and new badges here." />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border px-4 py-3 ${n.isRead ? 'border-gray-100 bg-white' : 'border-brand/20 bg-brand-light'}`}
            >
              <p className="text-sm text-gray-800">{n.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">{formatRelativeTime(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
