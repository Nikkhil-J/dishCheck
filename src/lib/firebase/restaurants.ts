import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit,
  type QueryConstraint,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Restaurant } from '../types'
import { logError } from '../logger'

/** Returns a single restaurant by ID, or null if not found. */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.RESTAURANTS, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Restaurant
  } catch (e) {
    logError('getRestaurant', e)
    return null
  }
}

/** Returns active restaurants, optionally filtered by city. Capped by limitCount. */
export async function getAllRestaurants(city?: string, limitCount = 100): Promise<Restaurant[]> {
  try {
    const ref = collection(db, COLLECTIONS.RESTAURANTS)
    const constraints: QueryConstraint[] = [where('isActive', '==', true)]
    if (city) constraints.push(where('city', '==', city))
    constraints.push(limit(limitCount))
    const snap = await getDocs(query(ref, ...constraints))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant)
  } catch (e) {
    logError('getAllRestaurants', e)
    return []
  }
}

/** Returns the count of active restaurants, optionally filtered by city. */
export async function getRestaurantCount(city?: string): Promise<number> {
  try {
    const ref = collection(db, COLLECTIONS.RESTAURANTS)
    const constraints: QueryConstraint[] = [where('isActive', '==', true)]
    if (city) constraints.push(where('city', '==', city))
    const snap = await getCountFromServer(query(ref, ...constraints))
    return snap.data().count
  } catch (e) {
    logError('getRestaurantCount', e)
    return 0
  }
}

/** Returns all active restaurants with no limit cap. Used for sitemap generation. */
export async function getAllRestaurantsUnpaginated(): Promise<Restaurant[]> {
  try {
    const ref = collection(db, COLLECTIONS.RESTAURANTS)
    const snap = await getDocs(
      query(ref, where('isActive', '==', true))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant)
  } catch (e) {
    logError('getAllRestaurantsUnpaginated', e)
    return []
  }
}

/** Returns all active restaurants in a given area. */
export async function getRestaurantsByArea(area: string): Promise<Restaurant[]> {
  try {
    const ref = collection(db, COLLECTIONS.RESTAURANTS)
    const snap = await getDocs(
      query(ref, where('isActive', '==', true), where('area', '==', area))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant)
  } catch (e) {
    logError('getRestaurantsByArea', e)
    return []
  }
}
