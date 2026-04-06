import { COLLECTIONS } from '@/lib/firebase/config'
import { adminAuth, adminDb } from '@/lib/firebase/admin-server'

export class RestaurantOwnerAuthError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization')
  if (!raw) {
    throw new RestaurantOwnerAuthError(401, 'Missing authorization token')
  }

  const [scheme, token] = raw.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new RestaurantOwnerAuthError(401, 'Invalid authorization header')
  }

  return token
}

export interface AssertRestaurantOwnerResult {
  userId: string
  restaurantId: string
}

/**
 * Verifies that the requesting user is the verified owner of the restaurant.
 * Throws RestaurantOwnerAuthError (401/403/404) on failure.
 */
export async function assertRestaurantOwner(
  req: Request,
  restaurantId: string
): Promise<AssertRestaurantOwnerResult> {
  const token = getBearerToken(req)

  let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decodedToken = await adminAuth.verifyIdToken(token)
  } catch {
    throw new RestaurantOwnerAuthError(401, 'Unauthorized')
  }

  const restaurantDoc = await adminDb
    .collection(COLLECTIONS.RESTAURANTS)
    .doc(restaurantId)
    .get()

  if (!restaurantDoc.exists) {
    throw new RestaurantOwnerAuthError(404, 'Restaurant not found')
  }

  const ownerId = restaurantDoc.get('ownerId') as string | null | undefined
  if (!ownerId || ownerId !== decodedToken.uid) {
    throw new RestaurantOwnerAuthError(403, 'You are not the owner of this restaurant')
  }

  return { userId: decodedToken.uid, restaurantId }
}
