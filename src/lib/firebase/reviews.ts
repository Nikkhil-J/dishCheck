import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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
import { computeOverall, computeTopTags, canEditReview } from '../utils'
import { REVIEWS_PER_PAGE, computeLevel, computeEarnedBadges } from '../constants'

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
      lastDoc: docs[docs.length - 1] ?? null,
      hasMore,
    }
  } catch {
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
      lastDoc: docs[docs.length - 1] ?? null,
      hasMore,
    }
  } catch {
    return { items: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Creates a review atomically:
 * 1. Writes the review doc
 * 2. Recomputes dish averages + topTags + reviewCount
 * 3. Increments user reviewCount and updates level + badges
 */
export async function createReview(data: ReviewFormData, user: User, photoUrl: string): Promise<Review | null> {
  try {
    const reviewRef = doc(collection(db, COLLECTIONS.REVIEWS))
    const dishRef   = doc(db, COLLECTIONS.DISHES, data.dishId)
    const userRef   = doc(db, COLLECTIONS.USERS, user.id)

    const now = Timestamp.now()

    const reviewData: Omit<Review, 'id'> = {
      dishId:         data.dishId,
      restaurantId:   data.restaurantId,
      userId:         user.id,
      userName:       user.displayName,
      userLevel:      user.level,
      userAvatarUrl:  user.avatarUrl,
      photoUrl,
      tasteRating:    data.tasteRating!,
      portionRating:  data.portionRating!,
      valueRating:    data.valueRating!,
      tags:           data.tags,
      text:           data.text || null,
      helpfulVotes:   0,
      helpfulVotedBy: [],
      isFlagged:      false,
      isApproved:     true,
      editedAt:       null,
      createdAt:      now,
    }

    await runTransaction(db, async (tx) => {
      const dishSnap = await tx.get(dishRef)
      const userSnap = await tx.get(userRef)

      if (!dishSnap.exists()) throw new Error('Dish not found')
      if (!userSnap.exists()) throw new Error('User not found')

      const dish = dishSnap.data()

      // Recompute dish averages
      const prevCount   = dish.reviewCount as number
      const newCount    = prevCount + 1
      const avgTaste    = ((dish.avgTaste   * prevCount) + data.tasteRating!)   / newCount
      const avgPortion  = ((dish.avgPortion * prevCount) + data.portionRating!) / newCount
      const avgValue    = ((dish.avgValue   * prevCount) + data.valueRating!)   / newCount
      const avgOverall  = computeOverall(avgTaste, avgPortion, avgValue)

      // Get existing reviews' tags to recompute topTags
      const existingTagsSnap = await getDocs(
        query(collection(db, COLLECTIONS.REVIEWS), where('dishId', '==', data.dishId))
      )
      const allTagArrays = [
        ...existingTagsSnap.docs.map((d) => d.data().tags as string[]),
        data.tags,
      ]
      const topTags = computeTopTags(allTagArrays)

      tx.set(reviewRef, reviewData)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount, topTags })

      // Update user level and badges
      const newReviewCount = (userSnap.data().reviewCount as number) + 1
      const newHelpfulVotes = userSnap.data().helpfulVotesReceived as number
      const newLevel  = computeLevel(newReviewCount)
      const newBadges = computeEarnedBadges(newReviewCount, newHelpfulVotes)
      tx.update(userRef, { reviewCount: newReviewCount, level: newLevel, badges: newBadges })
    })

    return { id: reviewRef.id, ...reviewData }
  } catch {
    return null
  }
}

/** Updates a review if it is still within the edit window. */
export async function updateReview(
  reviewId: string,
  updates: Partial<Pick<Review, 'tasteRating' | 'portionRating' | 'valueRating' | 'tags' | 'text'>>
): Promise<Review | null> {
  try {
    const ref  = doc(db, COLLECTIONS.REVIEWS, reviewId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const review = { id: snap.id, ...snap.data() } as Review
    if (!canEditReview(review.createdAt)) return null

    const payload = { ...updates, editedAt: Timestamp.now() }
    await updateDoc(ref, payload)
    return { ...review, ...payload }
  } catch {
    return null
  }
}

/** Deletes a review and recomputes the dish's averages. */
export async function deleteReview(reviewId: string, dishId: string): Promise<boolean> {
  try {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId)
    const dishRef   = doc(db, COLLECTIONS.DISHES, dishId)

    await runTransaction(db, async (tx) => {
      const dishSnap   = await tx.get(dishRef)
      const reviewSnap = await tx.get(reviewRef)
      if (!dishSnap.exists() || !reviewSnap.exists()) throw new Error('Not found')

      const dish   = dishSnap.data()
      const review = reviewSnap.data()
      const prevCount = dish.reviewCount as number
      const newCount  = Math.max(prevCount - 1, 0)

      let avgTaste = 0, avgPortion = 0, avgValue = 0, avgOverall = 0

      if (newCount > 0) {
        avgTaste   = ((dish.avgTaste   * prevCount) - review.tasteRating)   / newCount
        avgPortion = ((dish.avgPortion * prevCount) - review.portionRating) / newCount
        avgValue   = ((dish.avgValue   * prevCount) - review.valueRating)   / newCount
        avgOverall = computeOverall(avgTaste, avgPortion, avgValue)
      }

      // Recompute topTags from remaining reviews
      const remainingSnap = await getDocs(
        query(
          collection(db, COLLECTIONS.REVIEWS),
          where('dishId', '==', dishId),
          where('isApproved', '==', true)
        )
      )
      const allTagArrays = remainingSnap.docs
        .filter((d) => d.id !== reviewId)
        .map((d) => d.data().tags as string[])
      const topTags = computeTopTags(allTagArrays)

      tx.delete(reviewRef)
      tx.update(dishRef, { avgTaste, avgPortion, avgValue, avgOverall, reviewCount: newCount, topTags })
    })

    return true
  } catch {
    return false
  }
}

/** Adds userId to helpfulVotedBy and increments helpfulVotes. Idempotent. */
export async function voteHelpful(reviewId: string, userId: string): Promise<boolean> {
  try {
    const ref  = doc(db, COLLECTIONS.REVIEWS, reviewId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return false

    const review = snap.data() as Review
    if (review.helpfulVotedBy.includes(userId)) return true // already voted

    await updateDoc(ref, {
      helpfulVotedBy: arrayUnion(userId),
      helpfulVotes:   increment(1),
    })
    return true
  } catch {
    return false
  }
}

/** Sets isFlagged: true on a review. */
export async function flagReview(reviewId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), { isFlagged: true })
    return true
  } catch {
    return false
  }
}
