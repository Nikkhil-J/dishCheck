'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { getReviewsByUser } from '@/lib/firebase/reviews'
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@/lib/constants'
import { ReviewCard } from '@/components/features/ReviewCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Review } from '@/lib/types'

export default function MyProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getReviewsByUser(user.id).then((r) => {
      setReviews(r.items)
      setLoading(false)
    })
  }, [user])

  if (!user) return null

  const levelThreshold = LEVEL_THRESHOLDS[user.level]
  const nextLevel = user.level === 'Legend' ? null
    : user.level === 'Critic' ? 'Legend'
    : user.level === 'Foodie' ? 'Critic'
    : 'Foodie'
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel].min : null
  const progress = nextThreshold
    ? Math.min(100, ((user.reviewCount - levelThreshold.min) / (nextThreshold - levelThreshold.min)) * 100)
    : 100

  const earnedBadges = BADGE_DEFINITIONS.filter((b) => user.badges.includes(b.id))

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.displayName} width={72} height={72} className="rounded-full object-cover" />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-brand-light text-2xl font-bold text-brand">
            {user.displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{user.displayName}</h1>
          <p className="text-sm text-gray-500">{user.city || 'Bengaluru'}</p>
          <span className="mt-1 inline-block rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
            {user.level}
          </span>
        </div>
        <Link href="/settings" className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
          Edit profile
        </Link>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Reviews', value: user.reviewCount },
          { label: 'Helpful votes', value: user.helpfulVotesReceived },
          { label: 'Badges', value: earnedBadges.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Level progress */}
      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Level progress</span>
          <span className="text-xs text-gray-400">
            {nextLevel ? `${user.reviewCount} / ${nextThreshold} reviews to ${nextLevel}` : 'Max level reached!'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {earnedBadges.map((badge) => (
              <div key={badge.id} title={badge.description} className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs shadow-sm">
                <span>{badge.icon}</span>
                <span className="font-medium text-gray-700">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">My reviews</h2>
        {loading ? (
          <div className="mt-6 flex justify-center"><LoadingSpinner /></div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No reviews yet"
            description="Write your first review to get started."
            ctaLabel="Browse dishes"
            onCta={() => router.push('/browse')}
          />
        ) : (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
