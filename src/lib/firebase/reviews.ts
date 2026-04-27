import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  arrayUnion,
  increment,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Review, User, ReviewFormData, PaginatedResult } from '../types'
import { computeOverall, canEditReview } from '../utils/index'

import { REVIEWS_PER_PAGE } from '../constants'
import { computeLevel, computeEarnedBadges } from '../gamification'
import { logError } from '../logger'

/**
 * Derives the top 5 tags from a tagCounts map without reading any reviews.
 * Filters out tags with zero or negative counts (from decrements on deletions).
 */
function deriveTopTagsFromCounts(tagCounts: Record<string, number>): string[] {
  return Object.entries(tagCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
}

/** Returns a single review by ID. */
export async function getReview(reviewId: string): Promise<Review | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.REVIEWS, reviewId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Review
  } catch (e) {
    logError('getReview', e)
    return null
  }
}

/** Returns the total number of reviews using an aggregation query (no full scan). */
export async function getReviewCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, COLLECTIONS.REVIEWS))
    return snap.data().count
  } catch (e) {
    logError('getReviewCount', e)
    return 0
  }
}

/** Returns a review document snapshot by ID for pagination cursors. */
export async function getReviewSnapshot(reviewId: string): Promise<DocumentSnapshot | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.REVIEWS, reviewId))
    return snap.exists() ? snap : null
  } catch (e) {
    logError('getReviewSnapshot', e)
    return null
  }
}

/** Returns paginated reviews for a dish, ordered by createdAt descending. */
export async function getReviewsByDish(
  dishId: string,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Review>> {
  try {
    const ref = collection(db, COLLECTIONS.REVIEWS)
    const constraints = [
      where('dishId', '==', dishId),
      where('isApproved', '==', true),
      orderBy('createdAt', 'desc'),
      limit(REVIEWS_PER_PAGE + 1),
      ...(lastDoc ? [startAfter(lastDoc)] : []),
    ]
    const snap = await getDocs(query(ref, ...constraints))
    const hasMore = snap.docs.length > REVIEWS_PER_PAGE
    const docs = hasMore ? snap.docs.slice(0, REVIEWS_PER_PAGE) : snap.docs
    return {
      items: docs.map((d) => ({ id: d.id, ...d.data() }) as Review),
      lastDoc: docs[docs.length - 1]?.id ?? null,
      hasMore,
    }
  } catch (e) {
    logError('getReviewsByDish', e)
    return { items: [], lastDoc: null, hasMore: false }
  }
}

/** Returns paginated reviews written by a user. */
export async function getReviewsByUser(
  userId: string,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Review>> {
  try {
    const ref = collection(db, COLLECTIONS.REVIEWS)
    const constraints = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(REVIEWS_PER_PAGE + 1),
      ...(lastDoc ? [startAfter(lastDoc)] : []),
    ]
    const snap = await getDocs(query(ref, ...constraints))
    const hasMore = snap.docs.length > REVIEWS_PER_PAGE
    const docs = hasMore ? snap.docs.slice(0, REVIEWS_PER_PAGE) : snap.docs
    return {
      items: docs.map((d) => ({ id: d.id, ...d.data() }) as Review),
      lastDoc: docs[docs.length - 1]?.id ?? null,
      hasMore,
    }
  } catch (e) {
    logError('getReviewsByUser', e)
    return { items: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Creates a review atomically:
 * 1. Writes the review doc
 * 2. Recomputes dish averages + reviewCount
 * 3. Increments user reviewCount and updates level + badges
 *
 * Throws on duplicate reviews so the caller can surface the error.
 */
export async function createReview(data: ReviewFormData, user: User, photoUrl: string): Promise<Review | null> {
  const dupeCheck = await getDocs(
    query(
      collection(db, COLLECTIONS.REVIEWS),
      where('dishId', '==', data.dishId),
      where('userId', '==', user.id),
      limit(1)
    )
  )
  if (!dupeCheck.empty) throw new Error('You have already reviewed this dish')

  try {
    const reviewRef = doc(collection(db, COLLECTIONS.REVIEWS))
    const dishRef   = doc(db, COLLECTIONS.DISHES, data.dishId)
    const userRef   = doc(db, COLLECTIONS.USERS, user.id)

    const now = Timestamp.now()

    const reviewData = {
      dishId:         data.dishId,
      restaurantId:   data.restaurantId,
      userId:         user.id,
      userName:       user.displayName,
      userLevel:      user.level,
      userAvatarUrl:  user.avatarUrl,
      photoUrl:       photoUrl || null,
      tasteRating:    data.tasteRating!,
      portionRating:  data.portionRating!,
      valueRating:    data.valueRating!,
      tags:           data.tags,
      text:           data.text || null,
      billUrl:        data.billPreviewUrl ?? null,
      isVerified:     false,
      helpfulVotes:   0,
      helpfulVotedBy: [] as string[],
      isFlagged:      false,
      isApproved:     true,
      editedAt:       null as null,
      dishName:       '',
      restaurantName: '',
      createdAt:      now,
    }

    await runTransaction(db, async (tx) => {
      const dishSnap = await tx.get(dishRef)
      const userSnap = await tx.get(userRef)

      if (!dishSnap.exists()) throw new Error('Dish not found')
      if (!userSnap.exists()) throw new Error('User not found')

      const dish = dishSnap.data()

      reviewData.dishName = dish.name as string
      reviewData.restaurantName = dish.restaurantName as string

      const prevCount  = dish.reviewCount as number
      const newCount   = prevCount + 1
      const avgTaste   = ((dish.avgTaste   * prevCount) + data.tasteRating!)   / newCount
      const avgPortion = ((dish.avgPortion * prevCount) + data.portionRating!) / newCount
      const avgValue   = ((dish.avgValue   * prevCount) + data.valueRating!)   / newCount
      const avgOverall = computeOverall(avgTaste, avgPortion, avgValue)

      // Increment tag counts atomically — no getDocs scan needed
      const existingTagCounts = (dish.tagCounts as Record<string, number>) ?? {}
      const newTagCounts = { ...existingTagCounts }
      for (const tag of data.tags) {
        newTagCounts[tag] = (newTagCounts[tag] ?? 0) + 1
      }
      const topTags = deriveTopTagsFromCounts(newTagCounts)

      tx.set(reviewRef, reviewData)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount, tagCounts: newTagCounts, topTags })

      const newReviewCount  = (userSnap.data().reviewCount as number) + 1
      const newHelpfulVotes = userSnap.data().helpfulVotesReceived as number
      const newLevel        = computeLevel(newReviewCount)
      const newBadges       = computeEarnedBadges(newReviewCount, newHelpfulVotes)
      tx.update(userRef, { reviewCount: newReviewCount, level: newLevel, badges: newBadges })
    })

    return {
      id: reviewRef.id,
      ...reviewData,
      editedAt: null,
      createdAt: reviewData.createdAt.toDate().toISOString(),
    }
  } catch (e) {
    logError('createReview', e)
    return null
  }
}

/**
 * Updates a review if the caller owns it and it's within the edit window,
 * then recalculates dish averages and refreshes topTags.
 *
 * dishId cannot change on update — only ratings, tags, and text are editable,
 * so dishName/restaurantName do not need to be refreshed here.
 */
export async function updateReview(
  reviewId: string,
  callerId: string,
  updates: Partial<Pick<Review, 'tasteRating' | 'portionRating' | 'valueRating' | 'tags' | 'text'>>
): Promise<Review | null> {
  try {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId)
    const reviewSnap = await getDoc(reviewRef)
    if (!reviewSnap.exists()) return null

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
    const dishRef = doc(db, COLLECTIONS.DISHES, review.dishId)

    await runTransaction(db, async (tx) => {
      const dishSnap = await tx.get(dishRef)
      if (!dishSnap.exists()) throw new Error('Dish not found')

      tx.update(reviewRef, payload)

      const dish  = dishSnap.data()
      const count = dish.reviewCount as number
      const dishUpdates: Record<string, unknown> = {}

      if (count > 0) {
        const oldTaste   = review.tasteRating
        const oldPortion = review.portionRating
        const oldValue   = review.valueRating
        const newTaste   = updates.tasteRating   ?? oldTaste
        const newPortion = updates.portionRating ?? oldPortion
        const newValue   = updates.valueRating   ?? oldValue
        const avgTaste   = ((dish.avgTaste   as number) * count - oldTaste   + newTaste)   / count
        const avgPortion = ((dish.avgPortion as number) * count - oldPortion + newPortion) / count
        const avgValue   = ((dish.avgValue   as number) * count - oldValue   + newValue)   / count
        dishUpdates.avgTaste   = avgTaste
        dishUpdates.avgPortion = avgPortion
        dishUpdates.avgValue   = avgValue
        dishUpdates.avgOverall = computeOverall(avgTaste, avgPortion, avgValue)
      }

      if (updates.tags) {
        // Decrement old tag counts, increment new ones — no getDocs scan needed
        const existingTagCounts = (dish.tagCounts as Record<string, number>) ?? {}
        const newTagCounts = { ...existingTagCounts }
        for (const tag of review.tags) {
          newTagCounts[tag] = Math.max((newTagCounts[tag] ?? 0) - 1, 0)
        }
        for (const tag of updates.tags) {
          newTagCounts[tag] = (newTagCounts[tag] ?? 0) + 1
        }
        dishUpdates.tagCounts = newTagCounts
        dishUpdates.topTags   = deriveTopTagsFromCounts(newTagCounts)
      }

      if (Object.keys(dishUpdates).length > 0) {
        tx.update(dishRef, dishUpdates)
      }
    })

    return { ...review, ...updates, editedAt: editedAt.toDate().toISOString() }
  } catch (e) {
    logError('updateReview', e)
    return null
  }
}

/**
 * Deletes a review, recomputes dish averages, and decrements
 * the author's reviewCount / level / badges.
 * Caller must be the review owner or an admin (set isAdmin=true to bypass ownership).
 */
export async function deleteReview(reviewId: string, dishId: string, callerId: string, isAdmin = false): Promise<boolean> {
  try {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId)
    const dishRef   = doc(db, COLLECTIONS.DISHES, dishId)

    await runTransaction(db, async (tx) => {
      const dishSnap   = await tx.get(dishRef)
      const reviewSnap = await tx.get(reviewRef)
      if (!dishSnap.exists() || !reviewSnap.exists()) throw new Error('Not found')

      const review = reviewSnap.data()
      if (!isAdmin && (review.userId as string) !== callerId) throw new Error('Not authorized')

      const dish   = dishSnap.data()
      const prevCount = dish.reviewCount as number
      const newCount  = Math.max(prevCount - 1, 0)

      let avgTaste = 0, avgPortion = 0, avgValue = 0, avgOverall = 0

      if (newCount > 0) {
        avgTaste   = ((dish.avgTaste   * prevCount) - review.tasteRating)   / newCount
        avgPortion = ((dish.avgPortion * prevCount) - review.portionRating) / newCount
        avgValue   = ((dish.avgValue   * prevCount) - review.valueRating)   / newCount
        avgOverall = computeOverall(avgTaste, avgPortion, avgValue)
      }

      // Decrement tag counts for the deleted review's tags — no getDocs scan needed
      const existingTagCounts = (dish.tagCounts as Record<string, number>) ?? {}
      const newTagCounts = { ...existingTagCounts }
      for (const tag of (review.tags as string[]) ?? []) {
        newTagCounts[tag] = Math.max((newTagCounts[tag] ?? 0) - 1, 0)
      }
      const topTags = deriveTopTagsFromCounts(newTagCounts)

      tx.delete(reviewRef)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount, tagCounts: newTagCounts, topTags })

      const authorId = review.userId as string
      const userRef  = doc(db, COLLECTIONS.USERS, authorId)
      const userSnap = await tx.get(userRef)
      if (userSnap.exists()) {
        const userData       = userSnap.data()
        const newReviewCount = Math.max((userData.reviewCount as number) - 1, 0)
        const helpfulVotes   = userData.helpfulVotesReceived as number
        const newLevel       = computeLevel(newReviewCount)
        const newBadges      = computeEarnedBadges(newReviewCount, helpfulVotes)
        tx.update(userRef, { reviewCount: newReviewCount, level: newLevel, badges: newBadges })
      }
    })

    return true
  } catch (e) {
    logError('deleteReview', e)
    return false
  }
}

/**
 * Adds userId to helpfulVotedBy, increments helpfulVotes on the review,
 * and increments the author's helpfulVotesReceived + recomputes badges.
 * Self-votes are rejected. Idempotent — returns true if already voted.
 */
export async function voteHelpful(reviewId: string, voterId: string): Promise<boolean> {
  try {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId)

    await runTransaction(db, async (tx) => {
      const reviewSnap = await tx.get(reviewRef)
      if (!reviewSnap.exists()) throw new Error('Review not found')

      const review = reviewSnap.data()
      const authorId = review.userId as string
      if (authorId === voterId) return

      const votedBy = review.helpfulVotedBy as string[]
      if (votedBy.includes(voterId)) return

      tx.update(reviewRef, {
        helpfulVotedBy: arrayUnion(voterId),
        helpfulVotes:   increment(1),
      })

      const userRef  = doc(db, COLLECTIONS.USERS, authorId)
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists()) return

      const userData           = userSnap.data()
      const newHelpfulVotes    = (userData.helpfulVotesReceived as number) + 1
      const reviewCount        = userData.reviewCount as number
      const newBadges          = computeEarnedBadges(reviewCount, newHelpfulVotes)
      tx.update(userRef, { helpfulVotesReceived: newHelpfulVotes, badges: newBadges })
    })

    return true
  } catch (e) {
    logError('voteHelpful', e)
    return false
  }
}

/** Sets isFlagged: true and tracks who flagged via flaggedBy array. */
export async function flagReview(reviewId: string, userId: string): Promise<'ok' | 'already_flagged' | null> {
  try {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId)

    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(reviewRef)
      if (!snap.exists()) return null

      const flaggedBy = (snap.data().flaggedBy as string[] | undefined) ?? []
      if (flaggedBy.includes(userId)) return 'already_flagged' as const

      tx.update(reviewRef, {
        isFlagged: true,
        flaggedBy: arrayUnion(userId),
      })
      return 'ok' as const
    })
  } catch (e) {
    logError('flagReview', e)
    return null
  }
}
