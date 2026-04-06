import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { DishRequest, User } from '../types'
import { logError } from '../logger'

/** Creates a new dish request with status: pending. */
export async function createDishRequest(
  data: Pick<DishRequest, 'restaurantId' | 'restaurantName' | 'dishName' | 'description'>,
  user: User
): Promise<DishRequest | null> {
  try {
    const payload = {
      restaurantId:      data.restaurantId,
      restaurantName:    data.restaurantName,
      dishName:          data.dishName,
      description:       data.description,
      requestedBy:       user.id,
      requestedByName:   user.displayName,
      status:            'pending' as const,
      adminId:           null,
      adminNote:         null,
      createdAt:         Timestamp.now(),
    }
    const ref = await addDoc(collection(db, COLLECTIONS.DISH_REQUESTS), payload)
    return { id: ref.id, ...payload, createdAt: payload.createdAt.toDate().toISOString() }
  } catch (e) {
    logError('createDishRequest', e)
    return null
  }
}

/** Returns all pending dish requests. Admin only. */
export async function getPendingRequests(): Promise<DishRequest[]> {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.DISH_REQUESTS), where('status', '==', 'pending'))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DishRequest)
  } catch (e) {
    logError('getPendingRequests', e)
    return []
  }
}

