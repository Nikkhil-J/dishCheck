import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import type { User as FirebaseUser } from 'firebase/auth'
import { db, COLLECTIONS } from './config'
import type { User, UserProfileUpdate } from '../types'
import { logError } from '../logger'

/** Fields that may be updated through the profile/settings UI. */
const ALLOWED_UPDATE_FIELDS: ReadonlySet<keyof UserProfileUpdate> = new Set([
  'displayName',
  'avatarUrl',
  'city',
  'area',
  'favoriteCuisines',
])

/** Returns a user by ID, or null if not found. */
export async function getUser(id: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as User
  } catch (e) {
    logError('getUser', e)
    return null
  }
}

/** Creates a user doc on first sign-in with default values. Uses setDoc with merge to avoid race conditions. */
export async function createUser(firebaseUser: FirebaseUser): Promise<User | null> {
  try {
    const ref = doc(db, COLLECTIONS.USERS, firebaseUser.uid)
    const existing = await getDoc(ref)
    if (existing.exists()) return { id: existing.id, ...existing.data() } as User

    const newUser = {
      displayName:          firebaseUser.displayName ?? 'Foodie',
      email:                firebaseUser.email ?? '',
      avatarUrl:            firebaseUser.photoURL ?? null,
      city:                 '',
      level:                'Newbie' as const,
      reviewCount:          0,
      helpfulVotesReceived: 0,
      dishPointsBalance:    0,
      totalPointsEarned:    0,
      totalPointsRedeemed:  0,
      badges:               [],
      isAdmin:              false,
      isPremium:            false,
      premiumSince:         null,
      createdAt:            Timestamp.now(),
    }

    await setDoc(ref, newUser, { merge: true })
    return {
      id: firebaseUser.uid,
      ...newUser,
      createdAt: newUser.createdAt.toDate().toISOString(),
      premiumSince: null,
    }
  } catch (e) {
    logError('createUser', e)
    return null
  }
}

/** Partially updates a user doc. Only whitelisted profile fields are written. */
export async function updateUser(id: string, updates: UserProfileUpdate): Promise<boolean> {
  try {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_UPDATE_FIELDS.has(key as keyof UserProfileUpdate)) {
        sanitized[key] = value
      }
    }
    if (Object.keys(sanitized).length === 0) return true
    await updateDoc(doc(db, COLLECTIONS.USERS, id), sanitized)
    return true
  } catch (e) {
    logError('updateUser', e)
    return false
  }
}

/** Returns the review count for a user. Used for level computation. */
export async function getUserReviewCount(id: string): Promise<number> {
  try {
    const ref = collection(db, COLLECTIONS.REVIEWS)
    const snap = await getCountFromServer(query(ref, where('userId', '==', id)))
    return snap.data().count
  } catch (e) {
    logError('getUserReviewCount', e)
    return 0
  }
}
