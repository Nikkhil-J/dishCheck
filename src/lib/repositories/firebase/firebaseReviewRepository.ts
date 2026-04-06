import {
  collection,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import {
  createReview,
  deleteReview,
  flagReview,
  getReview,
  getReviewSnapshot,
  getReviewsByDish,
  getReviewsByUser,
  updateReview,
  voteHelpful,
} from '@/lib/firebase/reviews'
import { getFlaggedReviews, unflagReview } from '@/lib/firebase/admin'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import type { ReviewRepository } from '@/lib/repositories/reviewRepository'
import type { GetReviewsParams } from '@/lib/repositories/reviewRepository'
import type { PaginatedData } from '@/lib/repositories/dishRepository'
import type { Review, ReviewFormData, User } from '@/lib/types'
import { mapReview } from './mappers'
import { logError } from '@/lib/logger'

function toCursor(lastDoc: unknown): string | undefined {
  if (!lastDoc) return undefined
  if (typeof lastDoc === 'string') return lastDoc
  if (typeof lastDoc === 'object' && lastDoc !== null && 'id' in lastDoc) {
    const id = (lastDoc as { id?: unknown }).id
    return typeof id === 'string' ? id : undefined
  }
  return undefined
}

export class FirebaseReviewRepository implements ReviewRepository {
  async getById(reviewId: string): Promise<Review | null> {
    const review = await getReview(reviewId)
    return review ? mapReview(review) : null
  }

  /**
   * Checks if a user has already reviewed a specific dish.
   * Requires composite index on reviews: (userId ASC, dishId ASC).
   */
  async findByUserAndDish(userId: string, dishId: string): Promise<Review | null> {
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTIONS.REVIEWS),
          where('userId', '==', userId),
          where('dishId', '==', dishId),
          firestoreLimit(1),
        ),
      )

      if (snap.empty) return null
      const doc = snap.docs[0]
      return mapReview({ id: doc.id, ...doc.data() } as Review)
    } catch (e) {
      logError('findByUserAndDish', e)
      return null
    }
  }

  async getRecentByUser(userId: string, count: number): Promise<Review[]> {
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTIONS.REVIEWS),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(count),
        ),
      )

      return snap.docs.map((doc) => mapReview({ id: doc.id, ...doc.data() } as Review))
    } catch (e) {
      logError('getRecentByUser', e)
      return []
    }
  }

  async getMany(params: GetReviewsParams): Promise<PaginatedData<Review>> {
    if (!params.dishId && !params.userId) {
      return { data: [], hasMore: false }
    }
    const cursorSnap = params.cursor ? await getReviewSnapshot(params.cursor) : null
    const result = params.dishId
      ? await getReviewsByDish(params.dishId, cursorSnap)
      : await getReviewsByUser(params.userId ?? '', cursorSnap)

    return {
      data: result.items.map(mapReview),
      hasMore: result.hasMore,
      nextCursor: toCursor(result.lastDoc),
    }
  }

  async create(data: ReviewFormData, user: User, photoUrl: string): Promise<Review | null> {
    const review = await createReview(data, user, photoUrl)
    return review ? mapReview(review) : null
  }

  async update(
    reviewId: string,
    callerId: string,
    updates: Partial<Pick<Review, 'tasteRating' | 'portionRating' | 'valueRating' | 'tags' | 'text'>>
  ): Promise<Review | null> {
    const review = await updateReview(reviewId, callerId, updates)
    return review ? mapReview(review) : null
  }

  delete(reviewId: string, dishId: string, callerId: string, isAdmin?: boolean): Promise<boolean> {
    return deleteReview(reviewId, dishId, callerId, isAdmin)
  }

  voteHelpful(reviewId: string, voterId: string): Promise<boolean> {
    return voteHelpful(reviewId, voterId)
  }

  flag(reviewId: string, userId: string): Promise<'ok' | 'already_flagged' | null> {
    return flagReview(reviewId, userId)
  }

  async getFlagged(limit?: number): Promise<Review[]> {
    const reviews = await getFlaggedReviews(limit)
    return reviews.map(mapReview)
  }

  unflag(reviewId: string): Promise<boolean> {
    return unflagReview(reviewId)
  }
}
