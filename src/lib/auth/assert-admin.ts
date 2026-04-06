import { COLLECTIONS } from '@/lib/firebase/config'
import { adminAuth, adminDb } from '@/lib/firebase/admin-server'

export class AdminAuthError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization')
  if (!raw) {
    throw new AdminAuthError(401, 'Missing authorization token')
  }

  const [scheme, token] = raw.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AdminAuthError(401, 'Invalid authorization header')
  }

  return token
}

export interface AssertAdminResult {
  userId: string
}

export async function assertAdmin(req: Request): Promise<AssertAdminResult> {
  const token = getBearerToken(req)

  let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decodedToken = await adminAuth.verifyIdToken(token)
  } catch {
    throw new AdminAuthError(401, 'Unauthorized')
  }

  const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get()
  const hasAdminClaim = decodedToken.isAdmin === true
  const hasAdminDoc = userDoc.exists && userDoc.get('isAdmin') === true

  if (!hasAdminClaim || !hasAdminDoc) {
    throw new AdminAuthError(403, 'Forbidden')
  }

  return { userId: decodedToken.uid }
}
