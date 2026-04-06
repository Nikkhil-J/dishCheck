'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DEFAULT_COUPON_POINTS_COST } from '@/lib/types/rewards'
import type { BadgeDefinition } from '@/lib/types'

interface SuccessData {
  dishId: string
  dishName: string
  restaurantName: string
  newBadges: BadgeDefinition[]
  newReviewCount: number
  pointsAwarded: number
  newBalance: number
  isFullReview: boolean
}

function readSuccessData(): SuccessData | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('reviewSuccess')
  if (!raw) return null
  try {
    return JSON.parse(raw) as SuccessData
  } catch {
    return null
  }
}

export default function ReviewSuccessPage() {
  const router = useRouter()
  const [data] = useState<SuccessData | null>(readSuccessData)

  useEffect(() => {
    if (data) {
      sessionStorage.removeItem('reviewSuccess')
    } else {
      router.replace('/home')
    }
  }, [data, router])

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const progressPercent = Math.min((data.newBalance / DEFAULT_COUPON_POINTS_COST) * 100, 100)
  const pointsRemaining = Math.max(DEFAULT_COUPON_POINTS_COST - data.newBalance, 0)

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="animate-pop-in">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-5 font-display text-3xl font-bold text-bg-dark">Review Published!</h1>
        <p className="mt-3 text-text-secondary">
          Your review for <strong className="text-bg-dark">{data.dishName}</strong> at{' '}
          <strong className="text-bg-dark">{data.restaurantName}</strong> is now live.
        </p>

        {data.pointsAwarded > 0 && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="font-display text-2xl font-bold text-primary">
              +{data.pointsAwarded} DishPoints
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {data.isFullReview
                ? 'Full review bonus: photo + tags + detailed text'
                : 'Keep adding photos, tags, and longer text for more points!'}
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{data.newBalance} / {DEFAULT_COUPON_POINTS_COST}</span>
                <span>Next coupon</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {pointsRemaining > 0 ? (
                <p className="mt-2 text-xs text-text-secondary">
                  {pointsRemaining} more points to your next coupon
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-primary">
                  You can redeem a coupon now!
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-text-muted">
          You&apos;ve written <span className="font-display text-lg font-bold text-primary">{data.newReviewCount}</span> review{data.newReviewCount !== 1 ? 's' : ''} total.
        </p>

        {data.newBadges && data.newBadges.length > 0 && (
          <div className="mt-8 rounded-xl border border-accent bg-accent-light p-6">
            <p className="font-display text-sm font-bold text-[var(--color-accent)]">
              New Badge{data.newBadges.length > 1 ? 's' : ''} Earned!
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {data.newBadges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-1.5 rounded-lg bg-card px-5 py-3 shadow-sm">
                  <span className="text-3xl">{badge.icon}</span>
                  <span className="font-display text-xs font-bold text-bg-dark">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-text-muted">
          You can edit this review within 24 hours of posting.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/dish/${data.dishId}`}
            className="w-full rounded-pill bg-primary py-3 text-center text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-glow"
          >
            View dish page
          </Link>
          <Link
            href="/explore"
            className="w-full rounded-pill border-2 border-border py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
          >
            Review another dish
          </Link>
        </div>
      </div>
    </div>
  )
}
