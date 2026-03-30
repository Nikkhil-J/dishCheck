import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './config'
import type { DishRequest, User } from '../types'

/** Creates a new dish request with status: pending. */
export async function createDishRequest(
  data: Pick<DishRequest, 'restaurantId' | 'restaurantName' | 'dishName' | 'description'>,
  user: User
): Promise<DishRequest | null> {
  try {
    const payload: Omit<DishRequest, 'id'> = {
      restaurantId:      data.restaurantId,
      restaurantName:    data.restaurantName,
      dishName:          data.dishName,
      description:       data.description,
      requestedBy:       user.id,
      requestedByName:   user.displayName,
      status:            'pending',
      adminNote:         null,
      createdAt:         Timestamp.now(),
    }
    const ref = await addDoc(collection(db, COLLECTIONS.DISH_REQUESTS), payload)
    return { id: ref.id, ...payload }
  } catch {
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
  } catch {
    return []
  }
}

/** Sets a dish request status to approved. */
export async function approveRequest(requestId: string, adminId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.DISH_REQUESTS, requestId), {
      status:  'approved',
      adminId,
    })
    return true
  } catch {
    return false
  }
}

/** Sets a dish request status to rejected with an admin note. */
export async function rejectRequest(requestId: string, adminId: string, note: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.DISH_REQUESTS, requestId), {
      status:    'rejected',
      adminId,
      adminNote: note,
    })
    return true
  } catch {
    return false
  }
}
