'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_COUPON_POINTS_COST } from '@/lib/types/rewards'
import type { Coupon, CouponClaim, PointsBalance } from '@/lib/types/rewards'

type Tab = 'coupons' | 'claims'

export default function RewardsPage() {
  const { authUser } = useAuth()
  const [balance, setBalance] = useState<PointsBalance | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [claims, setClaims] = useState<CouponClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('coupons')

  const fetchAll = useCallback(async () => {
    if (!authUser) return
    const token = await authUser.getIdToken()
    const headers = { authorization: `Bearer ${token}` }

    const [balRes, coupRes, claimRes] = await Promise.all([
      fetch('/api/rewards/balance', { headers }),
      fetch('/api/rewards/coupons', { headers }),
      fetch('/api/rewards/claims', { headers }),
    ])

    if (balRes.ok) setBalance(await balRes.json() as PointsBalance)
    if (coupRes.ok) {
      const data = await coupRes.json() as { items: Coupon[] }
      setCoupons(data.items)
    }
    if (claimRes.ok) {
      const data = await claimRes.json() as { items: CouponClaim[] }
      setClaims(data.items)
    }
    setLoading(false)
  }, [authUser])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleRedeem(couponId: string) {
    if (!authUser) return
    setRedeeming(couponId)
    setRedeemError(null)
    setRedeemSuccess(null)

    try {
      const token = await authUser.getIdToken()
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ couponId }),
      })

      if (!res.ok) {
        const data = await res.json() as { message?: string }
        const msg = data.message ?? 'Redemption failed'
        setRedeemError(msg)
        toast.error(msg)
        return
      }

      const data = await res.json() as { claim: CouponClaim }
      setRedeemSuccess(`Coupon claimed! Your code: ${data.claim.code}`)
      toast.success(`Coupon claimed! Your code: ${data.claim.code}`, {
        duration: 6000,
        description: 'Check the "My Coupons" tab for details',
      })
      await fetchAll()
      setTab('claims')
    } catch {
      const msg = 'Something went wrong. Please try again.'
      setRedeemError(msg)
      toast.error(msg)
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const progressPercent = balance
    ? Math.min((balance.balance / DEFAULT_COUPON_POINTS_COST) * 100, 100)
    : 0

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-bg-dark">DishPoints & Rewards</h1>

      {/* Balance card */}
      {balance && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-primary">{balance.balance}</span>
            <span className="text-sm text-text-secondary">DishPoints</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{balance.balance} / {DEFAULT_COUPON_POINTS_COST}</span>
              <span>Next coupon</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="text-text-muted">Earned: </span>
              <span className="font-semibold text-bg-dark">{balance.totalEarned}</span>
            </div>
            <div>
              <span className="text-text-muted">Redeemed: </span>
              <span className="font-semibold text-bg-dark">{balance.totalRedeemed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex gap-1 rounded-xl bg-bg-cream p-1">
        {(['coupons', 'claims'] as const).map((t) => (
          <Button
            key={t}
            variant="ghost"
            onClick={() => setTab(t)}
            className={`flex-1 h-auto rounded-lg py-2.5 text-sm font-semibold ${
              tab === t
                ? 'bg-card text-primary shadow-sm hover:bg-card'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t === 'coupons' ? 'Available Coupons' : `My Coupons (${claims.length})`}
          </Button>
        ))}
      </div>

      {/* Alerts */}
      {redeemError && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {redeemError}
        </div>
      )}
      {redeemSuccess && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          {redeemSuccess}
        </div>
      )}

      {/* Coupons catalogue */}
      {tab === 'coupons' && (
        <div className="mt-6 space-y-4">
          {coupons.length === 0 ? (
            <EmptyState
              icon="🎟️"
              title="No coupons available"
              description="Check back soon — new coupons are added regularly."
            />
          ) : (
            coupons.map((coupon) => {
              const remaining = coupon.totalStock - coupon.claimedCount
              const canAfford = (balance?.balance ?? 0) >= coupon.pointsCost

              return (
                <div
                  key={coupon.id}
                  className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-bg-dark">{coupon.title}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{coupon.restaurantName}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-lg font-bold text-primary">
                        {coupon.discountType === 'flat' ? `₹${coupon.discountValue}` : `${coupon.discountValue}%`}
                      </span>
                      <span className="block text-xs text-text-muted">off</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-text-muted">
                      <span>{coupon.pointsCost} pts</span>
                      <span>{remaining} left</span>
                      {coupon.expiresAt && (
                        <span>Expires {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRedeem(coupon.id)}
                      disabled={!canAfford || redeeming === coupon.id}
                      className="h-auto rounded-pill px-5 py-2 text-xs font-semibold hover:bg-primary-dark hover:shadow-glow"
                    >
                      {redeeming === coupon.id ? (
                        <LoadingSpinner size="sm" />
                      ) : canAfford ? (
                        'Redeem'
                      ) : (
                        `Need ${coupon.pointsCost - (balance?.balance ?? 0)} more pts`
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Claimed coupons */}
      {tab === 'claims' && (
        <div className="mt-6 space-y-4">
          {claims.length === 0 ? (
            <EmptyState
              icon="🎫"
              title="No claimed coupons yet"
              description="Redeem your DishPoints for coupons from your favorite restaurants."
            />
          ) : (
            claims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-bg-dark">{claim.couponTitle}</h3>
                    <p className="mt-1 text-xs text-text-muted">
                      Claimed {new Date(claim.claimedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={claim.isRedeemed ? 'secondary' : 'default'}
                    className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                      claim.isRedeemed
                        ? 'bg-border text-text-muted'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {claim.isRedeemed ? 'Used' : 'Active'}
                  </Badge>
                </div>

                <div className="mt-4 rounded-lg bg-bg-cream p-3 text-center">
                  <span className="text-xs text-text-muted">Your code</span>
                  <p className="font-mono text-lg font-bold tracking-widest text-bg-dark">{claim.code}</p>
                </div>

                {claim.expiresAt && (
                  <p className="mt-2 text-xs text-text-muted">
                    Expires {new Date(claim.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
