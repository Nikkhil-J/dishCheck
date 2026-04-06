'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import type { Review } from '@/lib/types'
import { formatRelativeTime, canEditReview } from '@/lib/utils/index'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { TagCloud } from '@/components/ui/TagCloud'
import { UserAvatar } from '@/components/ui/Avatar'
import { LEVEL_COLORS } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ReviewCardProps {
  review: Review
  currentUserId?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function ReviewCard({ review, currentUserId, onEdit, onDelete }: ReviewCardProps) {
  const { authUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (photoOpen) {
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [photoOpen])
  const [hasVoted, setHasVoted] = useState(
    currentUserId ? review.helpfulVotedBy.includes(currentUserId) : false,
  )
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulVotes)
  const [flagged, setFlagged] = useState(review.isFlagged)

  const isOwn = currentUserId === review.userId
  const canEdit = isOwn && canEditReview(review.createdAt)

  async function handleVote() {
    if (!currentUserId || isOwn || hasVoted) return
    const token = authUser ? await authUser.getIdToken() : null
    if (!token) return
    setHasVoted(true)
    setHelpfulCount((n) => n + 1)
    const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/helpful`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setHasVoted(false)
      setHelpfulCount((n) => Math.max(n - 1, 0))
      toast.error('Could not mark as helpful')
    }
  }

  async function handleFlag() {
    if (!currentUserId || isOwn) return
    const token = authUser ? await authUser.getIdToken() : null
    if (!token) return
    setFlagged(true)
    const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/flag`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setFlagged(false)
      toast.error('Could not report review')
    } else {
      toast.success('Review reported')
    }
  }

  const levelColorClass = LEVEL_COLORS[review.userLevel as keyof typeof LEVEL_COLORS] ?? 'bg-border text-text-secondary'

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <UserAvatar src={review.userAvatarUrl} name={review.userName} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-bg-dark">{review.userName}</span>
              <Badge className={`rounded-pill px-2.5 text-[10px] font-semibold ${levelColorClass}`}>
                {review.userLevel}
              </Badge>
            </div>
            <p className="text-xs text-text-muted">{formatRelativeTime(review.createdAt)}</p>
          </div>
        </div>
        {isOwn && (
          <div className="flex gap-2">
            {canEdit ? (
              <>
                <Button variant="link" onClick={onEdit} className="h-auto p-0 text-xs font-medium text-primary">Edit</Button>
                <Button variant="link" onClick={onDelete} className="h-auto p-0 text-xs font-medium text-destructive">Delete</Button>
              </>
            ) : (
              <span
                className="cursor-not-allowed text-text-muted text-xs"
                title="Reviews can only be edited within 24 hours"
              >
                Edit window closed
              </span>
            )}
          </div>
        )}
      </div>

      {review.photoUrl && (
        <Button variant="ghost" onClick={() => setPhotoOpen(true)} className="mt-4 block h-auto w-full overflow-hidden rounded-md p-0 hover:bg-transparent">
          <Image
            src={review.photoUrl}
            alt="Review photo"
            width={600}
            height={300}
            className="w-full rounded-md object-cover"
          />
        </Button>
      )}

      <div className="mt-4 space-y-2">
        <SubRatingBar label="Taste" value={review.tasteRating} />
        <SubRatingBar label="Portion" value={review.portionRating} />
        <SubRatingBar label="Value" value={review.valueRating} />
      </div>

      {review.tags.length > 0 && (
        <div className="mt-4">
          <TagCloud tags={review.tags} maxVisible={5} />
        </div>
      )}

      {review.text && (
        <div className="mt-4">
          <p className={`text-sm leading-relaxed text-text-primary ${!expanded ? 'line-clamp-3' : ''}`}>
            {review.text}
          </p>
          {review.text.length > 150 && (
            <Button variant="link" onClick={() => setExpanded((v) => !v)} className="mt-1 h-auto p-0 text-xs font-semibold text-primary">
              {expanded ? 'Show less' : 'Read more'}
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <Button
          variant="ghost"
          onClick={handleVote}
          disabled={!currentUserId || isOwn}
          className={`h-auto p-0 text-xs font-medium transition-colors hover:bg-transparent ${hasVoted ? 'font-bold text-primary' : 'text-text-muted hover:text-text-secondary'} disabled:cursor-default disabled:opacity-100`}
        >
          👍 Helpful ({helpfulCount})
        </Button>
        {currentUserId && !isOwn && !flagged && (
          <Button variant="ghost" onClick={handleFlag} className="h-auto p-0 text-xs text-text-muted hover:bg-transparent hover:text-destructive">
            Report
          </Button>
        )}
        {flagged && <span className="text-xs text-text-muted">Reported</span>}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review photo"
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/80',
          'transition-all duration-200',
          photoOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setPhotoOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setPhotoOpen(false) }}
      >
        {review.photoUrl && (
          <>
            <Image src={review.photoUrl} alt="Review photo" width={800} height={600} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button
              ref={closeButtonRef}
              onClick={() => setPhotoOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close photo"
            >
              &times;
            </button>
          </>
        )}
      </div>
    </div>
  )
}
