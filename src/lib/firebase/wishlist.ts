import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS, SUBCOLLECTIONS } from './config'
import type { Dish, WishlistItem } from '../types'

function wishlistRef(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, SUBCOLLECTIONS.WISHLIST)
}

function wishlistDocRef(userId: string, dishId: string) {
  return doc(db, COLLECTIONS.USERS, userId, SUBCOLLECTIONS.WISHLIST, dishId)
}

/** Returns all wishlist items for a user. */
export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  try {
    const snap = await getDocs(wishlistRef(userId))
    return snap.docs.map((d) => d.data() as WishlistItem)
  } catch {
    return []
  }
}

/** Adds a dish to the user's wishlist. Idempotent. */
export async function addToWishlist(userId: string, dish: Dish): Promise<boolean> {
  try {
    const item: WishlistItem = {
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
  } catch {
    return false
  }
}

/** Removes a dish from the user's wishlist. */
export async function removeFromWishlist(userId: string, dishId: string): Promise<boolean> {
  try {
    await deleteDoc(wishlistDocRef(userId, dishId))
    return true
  } catch {
    return false
  }
}

/** Returns true if the dish is in the user's wishlist. */
export async function isInWishlist(userId: string, dishId: string): Promise<boolean> {
  try {
    const snap = await getDoc(wishlistDocRef(userId, dishId))
    return snap.exists()
  } catch {
    return false
  }
}
