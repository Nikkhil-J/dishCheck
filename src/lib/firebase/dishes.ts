import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Dish, PaginatedResult, SearchFilters } from '../types'
import { DISHES_PER_PAGE } from '../constants'

/** Returns a single dish by ID, or null if not found. */
export async function getDish(id: string): Promise<Dish | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.DISHES, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Dish
  } catch {
    return null
  }
}

/** Returns all active dishes for a restaurant, ordered by avgOverall descending. */
export async function getDishesByRestaurant(restaurantId: string): Promise<Dish[]> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const snap = await getDocs(
      query(
        ref,
        where('restaurantId', '==', restaurantId),
        where('isActive', '==', true),
        orderBy('avgOverall', 'desc')
      )
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dish)
  } catch {
    return []
  }
}

/** Searches dishes by name (partial match on nameLower) with optional filters. Paginated. */
export async function searchDishes(
  searchQuery: string,
  filters?: Partial<SearchFilters>,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Dish>> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const constraints: any[] = [where('isActive', '==', true)]

    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      constraints.push(
        where('nameLower', '>=', lower),
        where('nameLower', '<=', lower + '\uf8ff')
      )
    }

    if (filters?.dietary)    constraints.push(where('dietary', '==', filters.dietary))
    if (filters?.priceRange) constraints.push(where('priceRange', '==', filters.priceRange))
    if (filters?.minRating)  constraints.push(where('avgOverall', '>=', filters.minRating))

    const sortField = filters?.sortBy === 'highest-rated' ? 'avgOverall' : 'createdAt'
    constraints.push(orderBy(sortField, 'desc'))
    constraints.push(limit(DISHES_PER_PAGE + 1))

    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(ref, ...constraints))
    const hasMore = snap.docs.length > DISHES_PER_PAGE
    const docs = hasMore ? snap.docs.slice(0, DISHES_PER_PAGE) : snap.docs

    return {
      items: docs.map((d) => ({ id: d.id, ...d.data() }) as Dish),
      lastDoc: docs[docs.length - 1] ?? null,
      hasMore,
    }
  } catch {
    return { items: [], lastDoc: null, hasMore: false }
  }
}

/** Returns the top-rated active dishes across all restaurants. */
export async function getTopDishes(limitCount = 20): Promise<Dish[]> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const snap = await getDocs(
      query(ref, where('isActive', '==', true), orderBy('avgOverall', 'desc'), limit(limitCount))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dish)
  } catch {
    return []
  }
}

/** Returns a pair of dishes for comparison. Used for premium feature. */
export async function getDishComparison(id1: string, id2: string): Promise<[Dish, Dish] | null> {
  try {
    const [d1, d2] = await Promise.all([getDish(id1), getDish(id2)])
    if (!d1 || !d2) return null
    return [d1, d2]
  } catch {
    return null
  }
}
