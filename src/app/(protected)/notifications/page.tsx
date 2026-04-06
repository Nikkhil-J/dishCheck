'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { getNotifications } from '@/lib/services/notifications'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils/index'
import type { Notification } from '@/lib/types'

export default function NotificationsPage() {
  const { user, authUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getNotifications(user.id)
      .then(setNotifications)
      .finally(() => setLoading(false))
  }, [user])

  async function handleMarkAllRead() {
    if (!user || !authUser) return
    const token = await authUser.getIdToken()
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-bg-dark">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="link"
            onClick={handleMarkAllRead}
            className="h-auto p-0 text-xs font-medium text-primary"
          >
            Mark all read
          </Button>
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
          {notifications.map((n) => {
            const inner = (
              <>
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                <p className="text-sm text-text-secondary">{n.message}</p>
                <p className="mt-0.5 text-xs text-text-muted">{formatRelativeTime(n.createdAt)}</p>
              </>
            )
            const cls = `block rounded-xl border px-4 py-3 transition-colors ${n.isRead ? 'border-border bg-card' : 'border-primary/20 bg-primary-light'}`

            return n.linkUrl ? (
              <Link key={n.id} href={n.linkUrl} className={`${cls} hover:border-primary/40`}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className={cls}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
