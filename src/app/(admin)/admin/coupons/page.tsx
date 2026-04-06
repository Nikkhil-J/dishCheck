'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Coupon } from '@/lib/types/rewards'

interface CouponFormData {
  title: string
  restaurantId: string
  restaurantName: string
  discountValue: string
  discountType: 'flat' | 'percent'
  pointsCost: string
  totalStock: string
  expiresAt: string
  codesText: string
}

const EMPTY_FORM: CouponFormData = {
  title: '',
  restaurantId: '',
  restaurantName: '',
  discountValue: '',
  discountType: 'flat',
  pointsCost: '500',
  totalStock: '',
  expiresAt: '',
  codesText: '',
}

export default function AdminCouponsPage() {
  const { authUser } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CouponFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function getToken() {
    if (!authUser) throw new Error('Not authenticated')
    return authUser.getIdToken()
  }

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch('/api/admin/coupons', {
          headers: { authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json() as { items: Coupon[] }
          setCoupons(data.items)
        }
      } finally {
        setLoading(false)
      }
    }
    if (authUser) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser])

  async function handleCreate() {
    setSubmitting(true)
    setFormError(null)

    const codes = form.codesText
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean)

    const stock = Number(form.totalStock) || 0
    if (codes.length < stock) {
      setFormError(`Need at least ${stock} codes, got ${codes.length}`)
      setSubmitting(false)
      return
    }

    try {
      const token = await getToken()
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          restaurantId: form.restaurantId,
          restaurantName: form.restaurantName,
          discountValue: Number(form.discountValue),
          discountType: form.discountType,
          pointsCost: Number(form.pointsCost),
          totalStock: stock,
          expiresAt: form.expiresAt || null,
          codes,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { message?: string; errors?: Record<string, string[]> }
        setFormError(data.message ?? 'Failed to create coupon')
        return
      }

      const data = await res.json() as { item: Coupon }
      setCoupons((prev) => [data.item, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch {
      setFormError('Failed to create coupon')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(couponId: string) {
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId))
      }
    } catch {
      // Silently fail — coupon list will refresh next load
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-bg-dark">Coupon Management</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-pill px-5 py-2 font-semibold hover:bg-primary-dark"
        >
          {showForm ? 'Cancel' : '+ Add Coupon'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-bg-dark">New Coupon</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
                placeholder="₹50 off at Biryani Blues"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Restaurant Name</Label>
              <Input
                value={form.restaurantName}
                onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Restaurant ID</Label>
              <Input
                value={form.restaurantId}
                onChange={(e) => setForm({ ...form, restaurantId: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="mb-1 block text-xs font-semibold text-text-secondary">Discount Value</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
                  placeholder="50"
                />
              </div>
              <div className="w-28">
                <Label className="mb-1 block text-xs font-semibold text-text-secondary">Type</Label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as 'flat' | 'percent' })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="flat">Flat (₹)</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Points Cost</Label>
              <Input
                type="number"
                value={form.pointsCost}
                onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Total Stock</Label>
              <Input
                type="number"
                value={form.totalStock}
                onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-text-secondary">Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="h-auto px-3 py-2 text-sm border-border focus:border-primary"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold text-text-secondary">
              Coupon Codes (one per line)
            </Label>
            <textarea
              value={form.codesText}
              onChange={(e) => setForm({ ...form, codesText: e.target.value })}
              rows={5}
              placeholder={"DISH50-ABC123\nDISH50-DEF456\nDISH50-GHI789"}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {formError && (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={submitting || !form.title || !form.restaurantId || !form.discountValue || !form.totalStock || !form.codesText}
            className="rounded-pill px-6 py-2.5 font-semibold hover:bg-primary-dark"
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Create Coupon'}
          </Button>
        </div>
      )}

      {/* Coupon list */}
      <div className="mt-6 space-y-3">
        {coupons.length === 0 && !showForm ? (
          <EmptyState
            icon="🎟️"
            title="No active coupons"
            description="Add your first coupon using the button above."
          />
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="font-display font-bold text-bg-dark">{coupon.title}</h3>
                <p className="text-xs text-text-muted">
                  {coupon.restaurantName} · {coupon.claimedCount}/{coupon.totalStock} claimed · {coupon.pointsCost} pts
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => handleDeactivate(coupon.id)}
                className="rounded-pill bg-transparent border border-destructive/30 px-4 py-1.5 text-xs font-semibold hover:bg-destructive/5"
              >
                Deactivate
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
