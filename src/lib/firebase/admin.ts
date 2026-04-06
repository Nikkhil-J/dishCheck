import {
  collection,
  doc,
  getDocs,
  updateDoc,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { AdminStats, User, Review } from '../types'
import { logError } from '../logger'

/** Returns aggregate counts for the admin dashboard. */
export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const [restaurants, dishes, reviews, pending, flagged, users] = await Promise.all([
      getCountFromServer(query(collection(db, COLLECTIONS.RESTAURANTS), where('isActive', '==', true))),
      getCountFromServer(query(collection(db, COLLECTIONS.DISHES), where('isActive', '==', true))),
      getCountFromServer(collection(db, COLLECTIONS.REVIEWS)),
      getCountFromServer(query(collection(db, COLLECTIONS.DISH_REQUESTS), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, COLLECTIONS.REVIEWS), where('isFlagged', '==', true))),
      getCountFromServer(collection(db, COLLECTIONS.USERS)),
    ])
    return {
      totalRestaurants: restaurants.data().count,
      totalDishes:      dishes.data().count,
      totalReviews:     reviews.data().count,
      pendingRequests:  pending.data().count,
      flaggedReviews:   flagged.data().count,
      totalUsers:       users.data().count,
    }
  } catch (e) {
    logError('getAdminStats', e)
    return null
  }
}

/** Returns a list of users sorted by newest, capped by limitCount. */
export async function getUsers(limitCount = 100): Promise<User[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.USERS),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User)
  } catch (e) {
    logError('getUsers', e)
    return []
  }
}

/** Toggles the isAdmin flag on a user document. */
export async function toggleAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), { isAdmin })
    return true
  } catch (e) {
    logError('toggleAdmin', e)
    return false
  }
}

/** Toggles the isPremium flag and sets/clears premiumSince. */
export async function togglePremium(userId: string, isPremium: boolean): Promise<boolean> {
  try {
    const { Timestamp } = await import('firebase/firestore')
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      isPremium,
      premiumSince: isPremium ? Timestamp.now() : null,
    })
    return true
  } catch (e) {
    logError('togglePremium', e)
    return false
  }
}

/** Returns flagged reviews, capped by limitCount. */
export async function getFlaggedReviews(limitCount = 50): Promise<Review[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.REVIEWS),
        where('isFlagged', '==', true),
        limit(limitCount)
      )
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)
  } catch (e) {
    logError('getFlaggedReviews', e)
    return []
  }
}

/** Unflags a review and marks it as approved. */
export async function unflagReview(reviewId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      isFlagged: false,
      isApproved: true,
    })
    return true
  } catch (e) {
    logError('unflagReview', e)
    return false
  }
}
