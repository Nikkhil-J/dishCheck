import { createVerify } from 'node:crypto'
import type { AuthProvider } from './provider'

interface FirebaseTokenPayload {
  aud: string
  iss: string
  sub: string
  iat: number
  exp: number
  user_id?: string
}

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''

let certCache: Record<string, string> | null = null
let certsExpireAtMs = 0

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

export class FirebaseAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<{ id: string; email?: string } | null> {
    return null
  }

  async verifyToken(token: string): Promise<{ userId: string }> {
    const payload = await verifyFirebaseIdToken(token)
    if (!payload) throw new Error('Invalid token')
    return { userId: payload.user_id ?? payload.sub }
  }
}
