import { reviewRepository, userRepository } from '@/lib/repositories'
import { pointsRepository } from '@/lib/repositories/server'
import type { PointsRepository } from '@/lib/repositories/pointsRepository'
import type { DishPointTransaction, PointsBalance, PointTransactionType } from '@/lib/types/rewards'
import {
  POINTS_REVIEW_BASIC,
  POINTS_REVIEW_FULL,
  POINTS_STREAK_MULTIPLIER,
  STREAK_DAYS_REQUIRED,
  REVIEW_FULL_MIN_TEXT_LENGTH,
} from '@/lib/types/rewards'
import { createServerNotification } from '@/lib/services/notifications-server'
import { sendPointsMilestoneEmail } from '@/lib/services/email'
import { addBreadcrumb, captureError } from '@/lib/monitoring/sentry'

const MILESTONE_250 = 250
const MILESTONE_450 = 450

export interface ReviewDataForRewards {
  hasPhoto: boolean
  hasTags: boolean
  textLength: number
  text: string
  userId: string
}

const MIN_DISTINCT_WORDS = 5

function countDistinctWords(text: string): number {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
  return new Set(words).size
}

async function passesTextQualityCheck(text: string, userId: string): Promise<boolean> {
  if (countDistinctWords(text) < MIN_DISTINCT_WORDS) {
    addBreadcrumb('Text quality failed: too few distinct words', {
      userId,
      distinctWords: countDistinctWords(text),
    })
    return false
  }

  try {
    const recentReviews = await reviewRepository.getRecentByUser(userId, 3)
    const isDuplicate = recentReviews.some((r) => r.text === text)
    if (isDuplicate) {
      addBreadcrumb('Text quality failed: duplicate of recent review', { userId })
      return false
    }
  } catch {
    // If we can't check, give benefit of the doubt
  }

  return true
}

async function computeReviewPoints(data: ReviewDataForRewards): Promise<{
  type: PointTransactionType
  points: number
  description: string
}> {
  const meetsLengthRequirement =
    data.hasPhoto && data.hasTags && data.textLength >= REVIEW_FULL_MIN_TEXT_LENGTH

  if (meetsLengthRequirement) {
    const qualityOk = await passesTextQualityCheck(data.text, data.userId)
    if (qualityOk) {
      return {
        type: 'REVIEW_FULL',
        points: POINTS_REVIEW_FULL,
        description: `Full review: photo + tags + text (${data.textLength} chars)`,
      }
    }

    return {
      type: 'REVIEW_BASIC',
      points: POINTS_REVIEW_BASIC,
      description: 'Review downgraded: text failed quality check',
    }
  }

  if (data.hasPhoto && data.hasTags) {
    return {
      type: 'REVIEW_BASIC',
      points: POINTS_REVIEW_BASIC,
      description: 'Basic review: photo + tags',
    }
  }

  return {
    type: 'REVIEW_BASIC',
    points: POINTS_REVIEW_BASIC,
    description: 'Review submitted',
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function isConsecutiveDay(prev: Date, curr: Date): boolean {
  const nextDay = new Date(prev)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return isSameDay(nextDay, curr)
}

/**
 * Computes the user's current review streak by examining recent transactions.
 * Returns the streak length (number of consecutive days with a review).
 */
async function computeStreak(
  repo: PointsRepository,
  userId: string,
): Promise<number> {
  const { items } = await repo.getTransactions(userId, 50)

  const reviewTxs = items.filter(
    (tx) => tx.type === 'REVIEW_BASIC' || tx.type === 'REVIEW_FULL',
  )

  if (reviewTxs.length === 0) return 0

  const uniqueDays: Date[] = []
  for (const tx of reviewTxs) {
    const d = new Date(tx.createdAt)
    if (uniqueDays.length === 0 || !isSameDay(d, uniqueDays[uniqueDays.length - 1])) {
      uniqueDays.push(d)
    }
  }

  let streak = 1
  for (let i = 0; i < uniqueDays.length - 1; i++) {
    if (isConsecutiveDay(uniqueDays[i + 1], uniqueDays[i])) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export async function rewardPointsForReview(
  userId: string,
  reviewId: string,
  reviewData: ReviewDataForRewards,
): Promise<{ transactions: DishPointTransaction[]; totalPointsAwarded: number }> {
  const { type, points, description } = await computeReviewPoints(reviewData)
  const transactions: DishPointTransaction[] = []

  const reviewTx = await pointsRepository.appendTransaction({
    userId,
    type,
    points,
    refId: reviewId,
    description,
  })
  transactions.push(reviewTx)

  let totalPointsAwarded = points

  const streak = await computeStreak(pointsRepository, userId)

  if (streak >= STREAK_DAYS_REQUIRED && streak % STREAK_DAYS_REQUIRED === 0) {
    const bonusPoints = points * (POINTS_STREAK_MULTIPLIER - 1)
    const streakTx = await pointsRepository.appendTransaction({
      userId,
      type: 'STREAK_BONUS',
      points: bonusPoints,
      refId: reviewId,
      description: `${STREAK_DAYS_REQUIRED}-day streak bonus (${POINTS_STREAK_MULTIPLIER}x)`,
    })
    transactions.push(streakTx)
    totalPointsAwarded += bonusPoints
  }

  const balance = await pointsRepository.getBalance(userId)
  const newTotal = balance.totalEarned
  const prevTotal = newTotal - totalPointsAwarded

  if (prevTotal < MILESTONE_250 && newTotal >= MILESTONE_250) {
    createServerNotification(
      userId,
      'system',
      'Halfway to your coupon!',
      `You've earned ${MILESTONE_250} DishPoints — keep reviewing to unlock coupons!`,
      '/rewards'
    ).catch((e) => captureError(e, { route: 'rewards/rewardPointsForReview', extra: { context: 'notification' } }))
  }

  if (prevTotal < MILESTONE_450 && newTotal >= MILESTONE_450) {
    createServerNotification(
      userId,
      'system',
      '50 points to go!',
      `You're at ${newTotal} DishPoints — just ${500 - newTotal} more to redeem your first coupon!`,
      '/rewards'
    ).catch((e) => captureError(e, { route: 'rewards/rewardPointsForReview', extra: { context: 'notification' } }))

    userRepository.getById(userId).then((user) => {
      if (!user?.email) return
      return sendPointsMilestoneEmail(
        { email: user.email, displayName: user.displayName },
        newTotal,
        500 - newTotal,
      )
    }).catch((err) => captureError(err, { extra: { phase: 'milestone-email' } }))
  }

  return { transactions, totalPointsAwarded }
}

export async function getPointsBalance(userId: string): Promise<PointsBalance> {
  return pointsRepository.getBalance(userId)
}

export async function getPointsHistory(
  userId: string,
  limit: number = 20,
  cursor?: string,
): Promise<{ items: DishPointTransaction[]; nextCursor: string | null }> {
  return pointsRepository.getTransactions(userId, limit, cursor)
}

export { computeReviewPoints as _computeReviewPoints }
