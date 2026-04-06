import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { Dish, PaginatedResult, SearchFilters } from '../types'
import { DISHES_PER_PAGE } from '../constants'
import { logError } from '../logger'

/** Returns a single dish by ID, or null if not found. */
export async function getDish(id: string): Promise<Dish | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.DISHES, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Dish
  } catch (e) {
    logError('getDish', e)
    return null
  }
}

/** Returns a dish document snapshot by ID for pagination cursors. */
export async function getDishSnapshot(id: string): Promise<DocumentSnapshot | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.DISHES, id))
    return snap.exists() ? snap : null
  } catch (e) {
    logError('getDishSnapshot', e)
    return null
  }
}

/** Returns the total number of dishes using an aggregation query (no full scan). */
export async function getDishCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, COLLECTIONS.DISHES), where('isActive', '==', true))
    )
    return snap.data().count
  } catch (e) {
    logError('getDishCount', e)
    return 0
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
  } catch (e) {
    logError('getDishesByRestaurant', e)
    return []
  }
}

/** Returns related dishes from the same restaurant, excluding a given dish. */
export async function getRelatedDishes(
  restaurantId: string,
  excludeId: string,
  limitCount = 4
): Promise<Dish[]> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const snap = await getDocs(
      query(
        ref,
        where('restaurantId', '==', restaurantId),
        where('isActive', '==', true),
        limit(limitCount + 1)
      )
    )
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Dish)
      .filter((d) => d.id !== excludeId)
      .slice(0, limitCount)
  } catch (e) {
    logError('getRelatedDishes', e)
    return []
  }
}

/**
 * Searches dishes by name prefix with optional filters. Paginated.
 *
 * Firestore limitation: a range query (nameLower >= ...) cannot combine with
 * array-contains in the same query. When both `query` and `cuisine` are set,
 * cuisine filtering is applied in-memory after the query returns.
 */
export async function searchDishes(
  searchQuery: string,
  filters?: Partial<SearchFilters>,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Dish>> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const constraints: QueryConstraint[] = [where('isActive', '==', true)]

    if (filters?.city) {
      constraints.push(where('city', '==', filters.city))
    }

    const hasTextSearch = searchQuery.trim().length > 0
    const hasCuisineFilter = !!filters?.cuisine

    if (hasTextSearch) {
      const lower = searchQuery.toLowerCase()
      constraints.push(
        where('nameLower', '>=', lower),
        where('nameLower', '<=', lower + '\uf8ff')
      )
    }

    if (hasCuisineFilter && !hasTextSearch) {
      constraints.push(where('cuisines', 'array-contains', filters.cuisine))
    }

    if (filters?.area)       constraints.push(where('area', '==', filters.area))
    if (filters?.dietary)    constraints.push(where('dietary', '==', filters.dietary))
    if (filters?.priceRange) constraints.push(where('priceRange', '==', filters.priceRange))

    const hasMinRating = !!filters?.minRating
    if (hasMinRating) constraints.push(where('avgOverall', '>=', filters.minRating))

    const sortField = hasMinRating ? 'avgOverall'
      : filters?.sortBy === 'highest-rated' ? 'avgOverall'
      : filters?.sortBy === 'most-helpful' ? 'reviewCount'
      : 'createdAt'
    constraints.push(orderBy(sortField, 'desc'))

    const fetchLimit = hasCuisineFilter && hasTextSearch
      ? DISHES_PER_PAGE * 3
      : DISHES_PER_PAGE + 1
    constraints.push(limit(fetchLimit))

    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(ref, ...constraints))
    let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dish)

    if (hasCuisineFilter && hasTextSearch) {
      results = results.filter((d) => d.cuisines.includes(filters.cuisine!))
    }

    const hasMore = results.length > DISHES_PER_PAGE
    const items = hasMore ? results.slice(0, DISHES_PER_PAGE) : results

    const lastItem = items[items.length - 1]
    const nextCursor = lastItem
      ? (snap.docs.find((d) => d.id === lastItem.id)?.id ?? null)
      : null

    return { items, lastDoc: nextCursor, hasMore }
  } catch (e) {
    logError('searchDishes', e)
    return { items: [], lastDoc: null, hasMore: false }
  }
}

/** Returns all active dishes ordered by avgOverall desc. Used for sitemap generation. */
export async function getAllActiveDishes(): Promise<Dish[]> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const snap = await getDocs(
      query(ref, where('isActive', '==', true), orderBy('avgOverall', 'desc'))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dish)
  } catch (e) {
    logError('getAllActiveDishes', e)
    return []
  }
}

/** Returns the top-rated active dishes, optionally filtered by city. */
export async function getTopDishes(limitCount = 20, city?: string | null): Promise<Dish[]> {
  try {
    const ref = collection(db, COLLECTIONS.DISHES)
    const constraints: QueryConstraint[] = [where('isActive', '==', true)]
    if (city) {
      constraints.push(where('city', '==', city))
    }
    constraints.push(orderBy('avgOverall', 'desc'))
    constraints.push(limit(limitCount))
    const snap = await getDocs(query(ref, ...constraints))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dish)
  } catch (e) {
    logError('getTopDishes', e)
    return []
  }
}

/** Returns a pair of dishes for comparison. Used for premium feature. */
export async function getDishComparison(id1: string, id2: string): Promise<[Dish, Dish] | null> {
  try {
    const [d1, d2] = await Promise.all([getDish(id1), getDish(id2)])
    if (!d1 || !d2) return null
    return [d1, d2]
  } catch (e) {
    logError('getDishComparison', e)
    return null
  }
}
