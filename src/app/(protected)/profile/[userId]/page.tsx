'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { getUser } from '@/lib/firebase/users'
import { getReviewsByUser } from '@/lib/firebase/reviews'
import { BADGE_DEFINITIONS } from '@/lib/constants'
import { ReviewCard } from '@/components/features/ReviewCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User, Review } from '@/lib/types'

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    Promise.all([getUser(userId), getReviewsByUser(userId)]).then(([u, r]) => {
      setProfile(u)
      setReviews(r.items)
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  if (!profile) return <div className="py-20 text-center text-gray-500">User not found.</div>

  const earnedBadges = BADGE_DEFINITIONS.filter((b) => profile.badges.includes(b.id))

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <Image src={profile.avatarUrl} alt={profile.displayName} width={72} height={72} className="rounded-full object-cover" />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-brand-light text-2xl font-bold text-brand">
            {profile.displayName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
          <p className="text-sm text-gray-500">{profile.city || 'Bengaluru'}</p>
          <span className="mt-1 inline-block rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
            {profile.level}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Reviews', value: profile.reviewCount },
          { label: 'Helpful votes', value: profile.helpfulVotesReceived },
          { label: 'Badges', value: earnedBadges.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

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

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
        {reviews.length === 0 ? (
          <EmptyState icon="📝" title="No reviews yet" description="This user hasn't reviewed anything yet." />
        ) : (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} currentUserId={currentUser?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
