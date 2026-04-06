import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS, SUBCOLLECTIONS } from './config'
import type { Dish, WishlistItem } from '../types'
import { logError } from '../logger'

function wishlistRef(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, SUBCOLLECTIONS.WISHLIST)
}

function wishlistDocRef(userId: string, dishId: string) {
  return doc(db, COLLECTIONS.USERS, userId, SUBCOLLECTIONS.WISHLIST, dishId)
}

/** Returns all wishlist items for a user, newest first. */
export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  try {
    const snap = await getDocs(query(wishlistRef(userId), orderBy('savedAt', 'desc')))
    return snap.docs.map((d) => d.data() as WishlistItem)
  } catch (e) {
    logError('getWishlist', e)
    return []
  }
}

/** Adds a dish to the user's wishlist. Idempotent. */
export async function addToWishlist(userId: string, dish: Dish): Promise<boolean> {
  try {
    const item = {
      dishId:         dish.id,
      dishName:       dish.name,
      restaurantId:   dish.restaurantId,
      restaurantName: dish.restaurantName,
      coverImage:     dish.coverImage,
      avgOverall:     dish.avgOverall,
      savedAt:        Timestamp.now(),
    }
    await setDoc(wishlistDocRef(userId, dish.id), item)
    return true
  } catch (e) {
    logError('addToWishlist', e)
    return false
  }
}

/** Removes a dish from the user's wishlist. */
export async function removeFromWishlist(userId: string, dishId: string): Promise<boolean> {
  try {
    await deleteDoc(wishlistDocRef(userId, dishId))
    return true
  } catch (e) {
    logError('removeFromWishlist', e)
    return false
  }
}

/** Returns true if the dish is in the user's wishlist. */
export async function isInWishlist(userId: string, dishId: string): Promise<boolean> {
  try {
    const snap = await getDoc(wishlistDocRef(userId, dishId))
    return snap.exists()
  } catch (e) {
    logError('isInWishlist', e)
    return false
  }
}
