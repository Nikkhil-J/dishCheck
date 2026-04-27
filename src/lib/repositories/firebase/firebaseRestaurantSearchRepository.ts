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
  type QueryConstraint,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import type { Restaurant } from '@/lib/types'
import type { RestaurantSearchRepository, GetRestaurantsParams } from '@/lib/repositories/restaurantSearchRepository'
import type { PaginatedData } from '@/lib/repositories/dishRepository'
import { mapRestaurant } from './mappers'
import { logError } from '@/lib/logger'

const DEFAULT_PAGE_SIZE = 20

async function getRestaurantSnapshot(id: string): Promise<DocumentSnapshot | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.RESTAURANTS, id))
    return snap.exists() ? snap : null
  } catch {
    return null
  }
}

export class FirebaseRestaurantSearchRepository implements RestaurantSearchRepository {
  async search(params: GetRestaurantsParams): Promise<PaginatedData<Restaurant>> {
    try {
      const ref = collection(db, COLLECTIONS.RESTAURANTS)
      const constraints: QueryConstraint[] = [where('isActive', '==', true)]

      const searchQuery = params.query?.toLowerCase().trim() ?? ''

      if (searchQuery.length > 0) {
        constraints.push(
          where('nameLower', '>=', searchQuery),
          where('nameLower', '<=', searchQuery + '\uf8ff'),
        )
      } else {
        if (params.city) {
          constraints.push(where('city', '==', params.city))
        }
        if (params.area) {
          constraints.push(where('area', '==', params.area))
        }
      }

      if (!searchQuery && params.sortBy === 'newest') {
        constraints.push(orderBy('createdAt', 'desc'))
      } else if (!searchQuery && params.sortBy === 'alphabetical') {
        constraints.push(orderBy('name', 'asc'))
      }

      const pageSize = params.limit ?? DEFAULT_PAGE_SIZE
      constraints.push(limit(pageSize + 1))

      if (params.cursor) {
        const cursorSnap = await getRestaurantSnapshot(params.cursor)
        if (cursorSnap) constraints.push(startAfter(cursorSnap))
      }

      const snap = await getDocs(query(ref, ...constraints))
      const docs = snap.docs
      const hasMore = docs.length > pageSize
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs

      let items = resultDocs.map((d) =>
        mapRestaurant({ id: d.id, ...d.data() } as Restaurant)
      )

      if (searchQuery && params.city) {
        items = items.filter((r) => r.city === params.city)
      }
      if (searchQuery && params.cuisine) {
        items = items.filter((r) => r.cuisines.includes(params.cuisine!))
      }

      const lastDoc = resultDocs[resultDocs.length - 1]

      return {
        data: items,
        hasMore,
        nextCursor: hasMore && lastDoc ? lastDoc.id : undefined,
      }
    } catch (e) {
      logError('FirebaseRestaurantSearchRepository.search', e)
      return { data: [], hasMore: false }
    }
  }
}
