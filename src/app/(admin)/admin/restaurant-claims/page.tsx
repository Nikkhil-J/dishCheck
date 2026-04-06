'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime } from '@/lib/utils/index'
import type { RestaurantClaim } from '@/lib/types'

export default function AdminRestaurantClaimsPage() {
  const { authUser } = useAuth()
  const [claims, setClaims] = useState<RestaurantClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!authUser) return
    async function load() {
      const token = await authUser!.getIdToken()
      const res = await fetch('/api/admin/restaurant-claims', {
        headers: { authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setClaims(data.claims ?? [])
      }
      setLoading(false)
    }
    load()
  }, [authUser])

  async function handleAction(claimId: string, action: 'approve' | 'reject') {
    if (!authUser) return
    const token = await authUser.getIdToken()
    const res = await fetch('/api/admin/restaurant-claims', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        claimId,
        action,
        note: rejectNotes[claimId] ?? '',
      }),
    })
    if (res.ok) {
      setClaims((prev) => prev.filter((c) => c.id !== claimId))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-bg-dark">Restaurant Claims</h1>
      <p className="mt-1 text-sm text-text-muted">{claims.length} pending</p>

      {claims.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="🏪" title="No pending claims" description="All restaurant claims have been reviewed." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-bg-dark">{claim.restaurantName}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    Claimed by <strong>{claim.userName}</strong> ({claim.userEmail})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>Role: <strong className="text-text-primary">{claim.role}</strong></span>
                    <span>Phone: <strong className="text-text-primary">{claim.phone}</strong></span>
                    <span>{formatRelativeTime(claim.createdAt)}</span>
                  </div>
                  {claim.proofDocumentUrl && (
                    <a
                      href={claim.proofDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      View proof document &rarr;
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <Input
                  placeholder="Note (optional)…"
                  value={rejectNotes[claim.id] ?? ''}
                  onChange={(e) => setRejectNotes((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                  className="h-auto px-3 py-1.5 text-xs border-border focus:border-primary"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => handleAction(claim.id, 'approve')}
                  size="xs"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary-dark"
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction(claim.id, 'reject')}
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
