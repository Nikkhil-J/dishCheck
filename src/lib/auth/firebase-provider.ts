import { createVerify } from 'node:crypto'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { ClientAuthProvider, AuthSessionUser } from './provider'
import { auth } from '@/lib/firebase/config'
import { logError } from '@/lib/logger'

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''

interface FirebaseTokenPayload {
  aud: string
  iss: string
  sub: string
  iat: number
  exp: number
  user_id?: string
}

let certCache: Record<string, string> | null = null
let certsExpireAtMs = 0
const googleProvider = new GoogleAuthProvider()

type FirebaseAuthErrorLike = {
  code?: string
  customData?: {
    email?: string
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now()
  if (certCache && now < certsExpireAtMs) return certCache

  const res = await fetch(CERTS_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch Firebase certs')
  const certs = (await res.json()) as Record<string, string>

  const cacheControl = res.headers.get('cache-control') ?? ''
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 300
  certCache = certs
  certsExpireAtMs = now + maxAgeSec * 1000
  return certs
}

async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseTokenPayload | null> {
  if (!PROJECT_ID) return null

  const parts = idToken.split('.')
  if (parts.length !== 3) return null
  const [encodedHeader, encodedPayload, encodedSignature] = parts

  const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string; kid?: string }
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as FirebaseTokenPayload
  if (header.alg !== 'RS256' || !header.kid) return null

  const certs = await getGoogleCerts()
  const certPem = certs[header.kid]
  if (!certPem) return null

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${encodedHeader}.${encodedPayload}`)
  verifier.end()
  const sig = Buffer.from(
    encodedSignature.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedSignature.length / 4) * 4, '='),
    'base64'
  )
  if (!verifier.verify(certPem, sig)) return null

  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp <= nowSec || payload.iat > nowSec) return null
  if (!payload.sub || payload.sub.length > 128) return null
  if (payload.aud !== PROJECT_ID) return null
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) return null
  return payload
}

function toSessionUser(user: {
  uid: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
  getIdToken: () => Promise<string>
}): AuthSessionUser {
  return {
    id: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    avatarUrl: user.photoURL ?? null,
    getIdToken: () => user.getIdToken(),
  }
}

export class FirebaseClientAuthProvider implements ClientAuthProvider {
  async getCurrentUser(): Promise<{ id: string; email?: string } | null> {
    const user = auth.currentUser
    if (!user) return null
    return { id: user.uid, email: user.email ?? undefined }
  }

  async verifyToken(token: string): Promise<{ userId: string }> {
    const payload = await verifyFirebaseIdToken(token)
    if (!payload) throw new Error('Invalid token')
    return { userId: payload.user_id ?? payload.sub }
  }

  onAuthStateChange(callback: (user: AuthSessionUser | null) => void): () => void {
    return onIdTokenChanged(auth, (user) => callback(user ? toSessionUser(user) : null))
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e: unknown) {
      logError('signInWithGoogle', e)
      const error = e as FirebaseAuthErrorLike
      const code = error.code ?? ''
      if (code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email
        if (!email) {
          throw new Error('This email already has an account with a different sign-in method. Use your original sign-in method first.')
        }

        const methods = await fetchSignInMethodsForEmail(auth, email)
        if (methods.includes('password')) {
          throw new Error('This email is already registered with password sign-in. Use email/password first, then link Google from account settings.')
        }
        if (methods.includes('google.com')) {
          throw new Error('Google sign-in is already linked for this email. Please try again.')
        }
        if (methods.length > 0) {
          throw new Error(`This email is already registered. Use one of these methods first: ${methods.join(', ')}.`)
        }
        throw new Error('This email is already registered with another sign-in method.')
      }
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completion.')
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Allow popups for this site and try again.')
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled in Firebase Authentication settings.')
      }
      throw e
    }
  }

  async signInWithEmail(email: string, password: string): Promise<string | null> {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return null
    } catch (e: unknown) {
      logError('signInWithEmail', e)
      return e instanceof Error ? e.message : 'Sign in failed'
    }
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<string | null> {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      await user.reload()
      return null
    } catch (e: unknown) {
      logError('signUpWithEmail', e)
      return e instanceof Error ? e.message : 'Sign up failed'
    }
  }

  async sendPasswordReset(email: string): Promise<string | null> {
    try {
      await sendPasswordResetEmail(auth, email)
      return null
    } catch (e: unknown) {
      logError('sendPasswordReset', e)
      return e instanceof Error ? e.message : 'Failed to send reset email'
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth)
    } catch (e) {
      logError('signOut', e)
    }
  }
}
