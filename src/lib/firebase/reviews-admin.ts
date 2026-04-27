import 'server-only'

import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from './admin-server'
import { COLLECTIONS } from './config'
import type { Review, User, ReviewFormData } from '../types'
import { computeOverall, computeTopTags, canEditReview } from '../utils/index'
import { computeLevel, computeEarnedBadges } from '../gamification'
import { logError } from '../logger'

/**
 * Creates a review atomically using the Admin SDK (bypasses security rules).
 * 1. Writes the review doc
 * 2. Recomputes dish averages + reviewCount
 * 3. Increments user reviewCount and updates level + badges
 *
 * Throws on duplicate reviews so the caller can surface the error.
 */
export async function createReview(
  data: ReviewFormData,
  user: User,
  photoUrl: string
): Promise<Review | null> {
  const dupeSnap = await adminDb
    .collection(COLLECTIONS.REVIEWS)
    .where('dishId', '==', data.dishId)
    .where('userId', '==', user.id)
    .limit(1)
    .get()
  if (!dupeSnap.empty) throw new Error('You have already reviewed this dish')

  try {
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc()
    const dishRef = adminDb.collection(COLLECTIONS.DISHES).doc(data.dishId)
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(user.id)

    const now = Timestamp.now()

    const reviewData = {
      dishId: data.dishId,
      restaurantId: data.restaurantId,
      userId: user.id,
      userName: user.displayName,
      userLevel: user.level,
      userAvatarUrl: user.avatarUrl,
      photoUrl: photoUrl || null,
      tasteRating: data.tasteRating!,
      portionRating: data.portionRating!,
      valueRating: data.valueRating!,
      tags: data.tags,
      text: data.text || null,
      billUrl: data.billPreviewUrl ?? null,
      isVerified: false,
      helpfulVotes: 0,
      helpfulVotedBy: [] as string[],
      isFlagged: false,
      isApproved: true,
      editedAt: null,
      createdAt: now,
    }

    await adminDb.runTransaction(async (tx) => {
      const dishSnap = await tx.get(dishRef)
      const userSnap = await tx.get(userRef)

      if (!dishSnap.exists) throw new Error('Dish not found')
      if (!userSnap.exists) throw new Error('User not found')

      const dish = dishSnap.data()!

      const prevCount = dish.reviewCount as number
      const newCount = prevCount + 1
      const avgTaste = ((dish.avgTaste * prevCount) + data.tasteRating!) / newCount
      const avgPortion = ((dish.avgPortion * prevCount) + data.portionRating!) / newCount
      const avgValue = ((dish.avgValue * prevCount) + data.valueRating!) / newCount
      const avgOverall = computeOverall(avgTaste, avgPortion, avgValue)

      tx.set(reviewRef, reviewData)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount })

      const userData = userSnap.data()!
      const newReviewCount = (userData.reviewCount as number) + 1
      const newHelpfulVotes = userData.helpfulVotesReceived as number
      const newLevel = computeLevel(newReviewCount)
      const newBadges = computeEarnedBadges(newReviewCount, newHelpfulVotes)
      tx.update(userRef, { reviewCount: newReviewCount, level: newLevel, badges: newBadges })
    })

    const existingTagsSnap = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('dishId', '==', data.dishId)
      .get()
    const allTagArrays = existingTagsSnap.docs.map((d) => d.data().tags as string[])
    const topTags = computeTopTags(allTagArrays)
    await dishRef.update({ topTags })

    return {
      id: reviewRef.id,
      ...reviewData,
      editedAt: null,
      createdAt: reviewData.createdAt.toDate().toISOString(),
    }
  } catch (e) {
    logError('createReview [admin]', e)
    return null
  }
}

/**
 * Updates a review if the caller owns it and it's within the edit window,
 * then recalculates dish averages and refreshes topTags.
 * Uses Admin SDK.
 */
export async function updateReview(
  reviewId: string,
  callerId: string,
  updates: Partial<Pick<Review, 'tasteRating' | 'portionRating' | 'valueRating' | 'tags' | 'text'>>
): Promise<Review | null> {
  try {
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId)
    const reviewSnap = await reviewRef.get()
    if (!reviewSnap.exists) return null

    const raw = reviewSnap.data()!
    const createdAtRaw = raw.createdAt
    const createdAtStr: string =
      typeof createdAtRaw === 'string'
        ? createdAtRaw
        : createdAtRaw?.toDate?.().toISOString() ?? ''
    const review = { id: reviewSnap.id, ...raw, createdAt: createdAtStr } as Review

    if (review.userId !== callerId) return null
    if (!canEditReview(review.createdAt)) return null

    const editedAt = Timestamp.now()
    const payload = { ...updates, editedAt }
    const dishRef = adminDb.collection(COLLECTIONS.DISHES).doc(review.dishId)

    await adminDb.runTransaction(async (tx) => {
      const dishSnap = await tx.get(dishRef)
      if (!dishSnap.exists) throw new Error('Dish not found')

      tx.update(reviewRef, payload)

      const dish = dishSnap.data()!
      const count = dish.reviewCount as number

      if (count > 0) {
        const oldTaste = review.tasteRating
        const oldPortion = review.portionRating
        const oldValue = review.valueRating
        const newTaste = updates.tasteRating ?? oldTaste
        const newPortion = updates.portionRating ?? oldPortion
        const newValue = updates.valueRating ?? oldValue

        const avgTaste = ((dish.avgTaste as number) * count - oldTaste + newTaste) / count
        const avgPortion = ((dish.avgPortion as number) * count - oldPortion + newPortion) / count
        const avgValue = ((dish.avgValue as number) * count - oldValue + newValue) / count
        const avgOverall = computeOverall(avgTaste, avgPortion, avgValue)

        tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall })
      }
    })

    if (updates.tags) {
      const allReviewsSnap = await adminDb
        .collection(COLLECTIONS.REVIEWS)
        .where('dishId', '==', review.dishId)
        .where('isApproved', '==', true)
        .get()
      const allTagArrays = allReviewsSnap.docs.map((d) =>
        d.id === reviewId ? (updates.tags ?? d.data().tags as string[]) : d.data().tags as string[]
      )
      const topTags = computeTopTags(allTagArrays)
      await adminDb.collection(COLLECTIONS.DISHES).doc(review.dishId).update({ topTags })
    }

    return { ...review, ...updates, editedAt: editedAt.toDate().toISOString() }
  } catch (e) {
    logError('updateReview [admin]', e)
    return null
  }
}

/**
 * Deletes a review, recomputes dish averages, and decrements
 * the author's reviewCount / level / badges.
 * Uses Admin SDK.
 */
export async function deleteReview(
  reviewId: string,
  dishId: string,
  callerId: string,
  isAdmin = false
): Promise<boolean> {
  try {
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId)
    const dishRef = adminDb.collection(COLLECTIONS.DISHES).doc(dishId)

    await adminDb.runTransaction(async (tx) => {
      const dishSnap = await tx.get(dishRef)
      const reviewSnap = await tx.get(reviewRef)
      if (!dishSnap.exists || !reviewSnap.exists) throw new Error('Not found')

      const review = reviewSnap.data()!
      if (!isAdmin && (review.userId as string) !== callerId) throw new Error('Not authorized')

      const dish = dishSnap.data()!
      const prevCount = dish.reviewCount as number
      const newCount = Math.max(prevCount - 1, 0)

      let avgTaste = 0, avgPortion = 0, avgValue = 0, avgOverall = 0

      if (newCount > 0) {
        avgTaste = ((dish.avgTaste * prevCount) - review.tasteRating) / newCount
        avgPortion = ((dish.avgPortion * prevCount) - review.portionRating) / newCount
        avgValue = ((dish.avgValue * prevCount) - review.valueRating) / newCount
        avgOverall = computeOverall(avgTaste, avgPortion, avgValue)
      }

      tx.delete(reviewRef)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount })

      const authorId = review.userId as string
      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(authorId)
      const userSnap = await tx.get(userRef)
      if (userSnap.exists) {
        const userData = userSnap.data()!
        const newReviewCount = Math.max((userData.reviewCount as number) - 1, 0)
        const helpfulVotes = userData.helpfulVotesReceived as number
        const newLevel = computeLevel(newReviewCount)
        const newBadges = computeEarnedBadges(newReviewCount, helpfulVotes)
        tx.update(userRef, { reviewCount: newReviewCount, level: newLevel, badges: newBadges })
      }
    })

    const remainingSnap = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('dishId', '==', dishId)
      .where('isApproved', '==', true)
      .get()
    const allTagArrays = remainingSnap.docs.map((d) => d.data().tags as string[])
    const topTags = computeTopTags(allTagArrays)
    await dishRef.update({ topTags })

    return true
  } catch (e) {
    logError('deleteReview [admin]', e)
    return false
  }
}

/**
 * Adds userId to helpfulVotedBy, increments helpfulVotes on the review,
 * and increments the author's helpfulVotesReceived + recomputes badges.
 * Self-votes are rejected. Idempotent — returns true if already voted.
 * Uses Admin SDK.
 */
export async function voteHelpful(reviewId: string, voterId: string): Promise<boolean> {
  try {
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId)

    await adminDb.runTransaction(async (tx) => {
      const reviewSnap = await tx.get(reviewRef)
      if (!reviewSnap.exists) throw new Error('Review not found')

      const review = reviewSnap.data()!
      const authorId = review.userId as string
      if (authorId === voterId) return

      const votedBy = review.helpfulVotedBy as string[]
      if (votedBy.includes(voterId)) return

      tx.update(reviewRef, {
        helpfulVotedBy: FieldValue.arrayUnion(voterId),
        helpfulVotes: FieldValue.increment(1),
      })

      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(authorId)
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists) return

      const userData = userSnap.data()!
      const newHelpfulVotes = (userData.helpfulVotesReceived as number) + 1
      const reviewCount = userData.reviewCount as number
      const newBadges = computeEarnedBadges(reviewCount, newHelpfulVotes)
      tx.update(userRef, { helpfulVotesReceived: newHelpfulVotes, badges: newBadges })
    })

    return true
  } catch (e) {
    logError('voteHelpful [admin]', e)
    return false
  }
}

/** Sets isFlagged: true and tracks who flagged via flaggedBy array. Uses Admin SDK. */
export async function flagReview(
  reviewId: string,
  userId: string
): Promise<'ok' | 'already_flagged' | null> {
  try {
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId)

    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(reviewRef)
      if (!snap.exists) return null

      const flaggedBy = (snap.data()!.flaggedBy as string[] | undefined) ?? []
      if (flaggedBy.includes(userId)) return 'already_flagged' as const

      tx.update(reviewRef, {
        isFlagged: true,
        flaggedBy: FieldValue.arrayUnion(userId),
      })
      return 'ok' as const
    })
  } catch (e) {
    logError('flagReview [admin]', e)
    return null
  }
}
