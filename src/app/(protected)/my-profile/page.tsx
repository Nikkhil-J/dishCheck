'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { useMyReviews } from '@/lib/hooks/useMyReviews'
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@/lib/constants'
import { ReviewCard } from '@/components/features/ReviewCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Review } from '@/lib/types'

export default function MyProfilePage() {
  const { user, authUser } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: reviews = [], isLoading: loading } = useMyReviews()

  function handleEdit(review: Review) {
    router.push(`/write-review?dishId=${review.dishId}&restaurantId=${review.restaurantId}&editReviewId=${review.id}`)
  }

  async function handleDelete(review: Review) {
    if (!user || !authUser) return
    const token = await authUser.getIdToken()
    const confirmed = window.confirm('Delete this review? This cannot be undone.')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}?dishId=${encodeURIComponent(review.dishId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      await queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    } catch {
      alert('Failed to delete review. Please try again.')
    }
  }

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
  const allBadges = BADGE_DEFINITIONS.map((b) => ({
    ...b,
    earned: user.badges.includes(b.id),
  }))

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-primary to-secondary shadow-lg">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt={user.displayName} width={96} height={96} className="rounded-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold text-white">
              {user.displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-bg-dark">{user.displayName}</h1>
        <p className="mt-1 text-sm text-text-muted">{user.city || 'Bengaluru'}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-accent-light px-4 py-1.5 text-sm font-bold text-[var(--color-accent)]">
          ⭐ {user.level}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/settings" className="rounded-pill border-2 border-border px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary">
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 flex overflow-hidden rounded-xl border border-border bg-card">
        {[
          { label: 'Reviews', value: user.reviewCount },
          { label: 'Helpful', value: user.helpfulVotesReceived },
          { label: 'Badges', value: earnedBadges.length },
        ].map(({ label, value }, i) => (
          <div key={label} className={`flex-1 py-5 text-center ${i < 2 ? 'border-r border-border' : ''}`}>
            <div className="font-display text-2xl font-bold text-bg-dark">{value}</div>
            <div className="text-xs text-text-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Level progress */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display font-semibold text-bg-dark">Level Progress</span>
          <span className="text-xs text-text-muted">
            {nextLevel ? `${nextThreshold! - user.reviewCount} more to ${nextLevel}` : 'Max level!'}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-text-muted">
          <span>{user.reviewCount}{nextThreshold ? ` / ${nextThreshold}` : ''} reviews</span>
          {nextLevel && <span>{nextLevel}</span>}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-bg-dark">
          Badges ({earnedBadges.length}/{BADGE_DEFINITIONS.length})
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {allBadges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-lg border border-border bg-card p-4 text-center transition-all ${
                badge.earned ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-40'
              }`}
            >
              <div className="text-3xl">{badge.earned ? badge.icon : '🔒'}</div>
              <div className="mt-2 font-display text-xs font-semibold">{badge.label}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">{badge.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-bg-dark">My Reviews</h2>
        {loading ? (
          <div className="mt-6 flex justify-center"><LoadingSpinner /></div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No reviews yet"
            description="Write your first review to get started."
            ctaLabel="Explore dishes"
            ctaHref="/explore"
          />
        ) : (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={user.id}
                onEdit={() => handleEdit(review)}
                onDelete={() => handleDelete(review)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
