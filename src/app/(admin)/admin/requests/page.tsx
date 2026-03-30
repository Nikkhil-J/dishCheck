'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getPendingRequests, approveRequest, rejectRequest } from '@/lib/firebase/dishRequests'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { DishRequest } from '@/lib/types'

export default function AdminRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<DishRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  useEffect(() => {
    getPendingRequests().then((r) => { setRequests(r); setLoading(false) })
  }, [])

  async function handleApprove(id: string) {
    if (!user) return
    await approveRequest(id, user.id)
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleReject(id: string) {
    if (!user) return
    await rejectRequest(id, user.id, rejectNote[id] ?? '')
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Dish Requests</h1>
      <p className="mt-1 text-sm text-gray-500">{requests.length} pending</p>

      {requests.length === 0 ? (
        <div className="mt-8"><EmptyState icon="✅" title="All clear" description="No pending dish requests." /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{req.dishName}</p>
                  <p className="text-sm text-gray-500">{req.restaurantName}</p>
                  {req.description && <p className="mt-1 text-xs text-gray-400">{req.description}</p>}
                  <p className="mt-1 text-xs text-gray-400">Requested by {req.requestedByName}</p>
                </div>
              </div>
              <div className="mt-3">
                <input
                  placeholder="Rejection note (optional)…"
                  value={rejectNote[req.id] ?? ''}
                  onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleApprove(req.id)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
