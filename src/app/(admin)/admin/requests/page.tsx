'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getPendingRequests } from '@/lib/services/dish-requests'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DishRequest } from '@/lib/types'

export default function AdminRequestsPage() {
  const { user, authUser } = useAuth()
  const [requests, setRequests] = useState<DishRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  useEffect(() => {
    getPendingRequests().then((r) => { setRequests(r); setLoading(false) })
  }, [])

  async function handleApprove(id: string) {
    if (!user || !authUser) return
    const token = await authUser.getIdToken()
    const response = await fetch(`/api/admin/dish-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (response.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id))
    }
  }

  async function handleReject(id: string) {
    if (!user || !authUser) return
    const token = await authUser.getIdToken()
    const response = await fetch(`/api/admin/dish-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'reject', note: rejectNote[id] ?? '' }),
    })
    if (response.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-bg-dark">Dish Requests</h1>
      <p className="mt-1 text-sm text-text-muted">{requests.length} pending</p>

      {requests.length === 0 ? (
        <div className="mt-8"><EmptyState icon="✅" title="All clear" description="No pending dish requests." /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-bg-dark">{req.dishName}</p>
                  <p className="text-sm text-text-secondary">{req.restaurantName}</p>
                  {req.description && <p className="mt-1 text-xs text-text-muted">{req.description}</p>}
                  <p className="mt-1 text-xs text-text-muted">Requested by {req.requestedByName}</p>
                </div>
              </div>
              <div className="mt-3">
                <Input
                  placeholder="Rejection note (optional)…"
                  value={rejectNote[req.id] ?? ''}
                  onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="h-auto px-3 py-1.5 text-xs border-border focus:border-primary"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => handleApprove(req.id)}
                  size="xs"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary-dark"
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(req.id)}
                  size="xs"
                  className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-cream"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
