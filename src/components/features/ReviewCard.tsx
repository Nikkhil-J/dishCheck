'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Review } from '@/lib/types'
import { formatRelativeTime, canEditReview } from '@/lib/utils/index'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { TagCloud } from '@/components/ui/TagCloud'
import { voteHelpful, flagReview } from '@/lib/firebase/reviews'
import { UserAvatar } from '@/components/ui/Avatar'

const LEVEL_COLORS: Record<string, string> = {
  Newbie: 'bg-gray-100 text-gray-600',
  Foodie: 'bg-brand-light text-brand-dark',
  Critic: 'bg-amber-100 text-amber-700',
  Legend: 'bg-purple-100 text-purple-700',
}

interface ReviewCardProps {
  review: Review
  currentUserId?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function ReviewCard({ review, currentUserId, onEdit, onDelete }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [hasVoted, setHasVoted] = useState(
    currentUserId ? review.helpfulVotedBy.includes(currentUserId) : false,
  )
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulVotes)
  const [flagged, setFlagged] = useState(review.isFlagged)
  const [flagConfirm, setFlagConfirm] = useState(false)

  const isOwn = currentUserId === review.userId
  const canEdit = isOwn && canEditReview(review.createdAt)

  async function handleVote() {
    if (!currentUserId || isOwn || hasVoted) return
    setHasVoted(true)
    setHelpfulCount((n) => n + 1)
    await voteHelpful(review.id, currentUserId)
  }

  async function handleFlag() {
    if (!currentUserId || isOwn) return
    setFlagConfirm(false)
    setFlagged(true)
    await flagReview(review.id)
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      {/* User row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <UserAvatar src={review.userAvatarUrl} name={review.userName} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{review.userName}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[review.userLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                {review.userLevel}
              </span>
            </div>
            <p className="text-xs text-gray-400">{formatRelativeTime(review.createdAt)}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-xs text-brand hover:underline">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
          </div>
        )}
      </div>

      {/* Photo */}
      {review.photoUrl && (
        <button onClick={() => setPhotoOpen(true)} className="mt-3 block w-full overflow-hidden rounded-xl">
          <Image
            src={review.photoUrl}
            alt="Review photo"
            width={600}
            height={300}
            className="w-full object-cover rounded-xl"
          />
        </button>
      )}

      {/* Ratings */}
      <div className="mt-3 space-y-1.5">
        <SubRatingBar label="Taste" value={review.tasteRating} />
        <SubRatingBar label="Portion" value={review.portionRating} />
        <SubRatingBar label="Value" value={review.valueRating} />
      </div>

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="mt-3">
          <TagCloud tags={review.tags} maxVisible={5} />
        </div>
      )}

      {/* Text */}
      {review.text && (
        <div className="mt-3">
          <p className={`text-sm text-gray-700 ${!expanded ? 'line-clamp-3' : ''}`}>
            {review.text}
          </p>
          {review.text.length > 150 && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs text-brand hover:underline">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Helpful + Flag */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={handleVote}
          disabled={!currentUserId || isOwn}
          className={`text-xs transition-colors ${hasVoted ? 'font-semibold text-brand' : 'text-gray-400 hover:text-gray-600'} disabled:cursor-default`}
        >
          👍 Helpful ({helpfulCount})
        </button>
        {currentUserId && !isOwn && !flagged && (
          <button onClick={() => setFlagConfirm(true)} className="text-xs text-gray-400 hover:text-red-500">
            Report
          </button>
        )}
        {flagged && <span className="text-xs text-gray-400">Reported</span>}
      </div>

      {/* Flag confirm */}
      {flagConfirm && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          <span>Report this review?</span>
          <button onClick={handleFlag} className="font-semibold hover:underline">Yes</button>
          <button onClick={() => setFlagConfirm(false)} className="hover:underline">Cancel</button>
        </div>
      )}

      {/* Photo lightbox */}
      {photoOpen && review.photoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPhotoOpen(false)}>
          <Image src={review.photoUrl} alt="Review photo" width={800} height={600} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}
