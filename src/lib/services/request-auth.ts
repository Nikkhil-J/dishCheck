import { FirebaseAuthProvider } from '@/lib/auth/firebase-auth-provider'
import { userRepository } from '@/lib/repositories'

export interface RequestAuthContext {
  userId: string
  isAdmin: boolean
  userCity: string
}

const authProvider = new FirebaseAuthProvider()

function getBearerToken(req: Request): string | null {
  const raw = req.headers.get('authorization')
  if (!raw) return null
  const [scheme, token] = raw.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function getRequestAuth(req: Request): Promise<RequestAuthContext | null> {
  const token = getBearerToken(req)
  if (!token) return null

  let verified: { userId: string }
  try {
    verified = await authProvider.verifyToken(token)
  } catch {
    return null
  }

  const user = await userRepository.getById(verified.userId)
  if (!user) return null

  return {
    userId: verified.userId,
    isAdmin: !!user.isAdmin,
    userCity: user.city || 'Bengaluru',
  }
}

