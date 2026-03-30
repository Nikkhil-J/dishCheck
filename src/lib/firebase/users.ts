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
import type { User } from '../types'
import { computeLevel } from '../constants'

/** Returns a user by ID, or null if not found. */
export async function getUser(id: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as User
  } catch {
    return null
  }
}

/** Creates a user doc on first sign-in with default values. */
export async function createUser(firebaseUser: FirebaseUser): Promise<User | null> {
  try {
    const ref = doc(db, COLLECTIONS.USERS, firebaseUser.uid)
    const existing = await getDoc(ref)
    if (existing.exists()) return { id: existing.id, ...existing.data() } as User

    const newUser: Omit<User, 'id'> = {
      displayName:          firebaseUser.displayName ?? 'Foodie',
      email:                firebaseUser.email ?? '',
      avatarUrl:            firebaseUser.photoURL ?? null,
      city:                 '',
      level:                'Newbie',
      reviewCount:          0,
      helpfulVotesReceived: 0,
      badges:               [],
      isAdmin:              false,
      isPremium:            false,
      premiumSince:         null,
      createdAt:            Timestamp.now(),
    }

    await setDoc(ref, newUser)
    return { id: firebaseUser.uid, ...newUser }
  } catch {
    return null
  }
}

/** Partially updates a user doc. */
export async function updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, id), updates as Record<string, unknown>)
    return true
  } catch {
    return false
  }
}

/** Returns the review count for a user. Used for level computation. */
export async function getUserReviewCount(id: string): Promise<number> {
  try {
    const ref = collection(db, COLLECTIONS.REVIEWS)
    const snap = await getCountFromServer(query(ref, where('userId', '==', id)))
    return snap.data().count
  } catch {
    return 0
  }
}
