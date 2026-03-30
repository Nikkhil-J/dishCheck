import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Restaurant } from '../types'

/** Returns a single restaurant by ID, or null if not found. */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.RESTAURANTS, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Restaurant
  } catch {
    return null
  }
}

/** Returns all active restaurants, optionally filtered by city. */
export async function getAllRestaurants(city?: string): Promise<Restaurant[]> {
  try {
    const ref = collection(db, COLLECTIONS.RESTAURANTS)
    const constraints = city
      ? [where('isActive', '==', true), where('city', '==', city)]
      : [where('isActive', '==', true)]
    const snap = await getDocs(query(ref, ...constraints))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant)
  } catch {
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
  } catch {
    return []
  }
}
