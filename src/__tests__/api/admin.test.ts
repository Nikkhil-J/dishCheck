import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/firebase/config', () => ({
  auth: {},
  db: {},
  COLLECTIONS: {
    RESTAURANTS: 'restaurants',
    DISHES: 'dishes',
    REVIEWS: 'reviews',
    USERS: 'users',
    DISH_REQUESTS: 'dishRequests',
    NOTIFICATIONS: 'notifications',
  },
  SUBCOLLECTIONS: {
    WISHLIST: 'wishlist',
  },
}))

vi.mock('@/lib/firebase/admin-server', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(),
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'test',
    NEXT_PUBLIC_FIREBASE_APP_ID: 'test',
  },
}))

vi.mock('@/lib/gamification', () => ({
  computeLevel: vi.fn(() => 'Newbie'),
  computeEarnedBadges: vi.fn(() => []),
}))

vi.mock('@/lib/utils/index', () => ({
  computeOverall: vi.fn(() => 0),
  computeTopTags: vi.fn(() => []),
}))

import { adminAuth, adminDb } from '@/lib/firebase/admin-server'
import { PATCH as patchRole } from '@/app/api/admin/users/[userId]/role/route'
import { PATCH as patchPremium } from '@/app/api/admin/users/[userId]/premium/route'
import { PATCH as patchDishRequest } from '@/app/api/admin/dish-requests/[id]/route'

function makeRequest(body: unknown, token?: string): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('http://localhost/api/admin/test', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function makeContext<T>(params: T) {
  return { params: Promise.resolve(params) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Admin role route', () => {
  it('returns 401 when no token is provided', async () => {
    const req = makeRequest({ isAdmin: true })
    const res = await patchRole(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error('bad token'))

    const req = makeRequest({ isAdmin: true }, 'bad-token')
    const res = await patchRole(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not admin (missing claim)', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'user1',
      isAdmin: false,
    } as unknown as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>)

    const mockDoc = { exists: true, get: vi.fn(() => true) }
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn(),
      })),
    } as never)

    const req = makeRequest({ isAdmin: true }, 'valid-token')
    const res = await patchRole(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when user is not admin (missing doc field)', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'user1',
      isAdmin: true,
    } as unknown as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>)

    const mockDoc = { exists: true, get: vi.fn(() => false) }
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn(),
      })),
    } as never)

    const req = makeRequest({ isAdmin: true }, 'valid-token')
    const res = await patchRole(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when body fails validation', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'admin1',
      isAdmin: true,
    } as unknown as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>)

    const mockDoc = { exists: true, get: vi.fn(() => true) }
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn(),
      })),
    } as never)

    const req = makeRequest({ isAdmin: 'yes-please' }, 'valid-token')
    const res = await patchRole(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors).toBeDefined()
  })
})

describe('Admin premium route', () => {
  it('returns 401 when no token is provided', async () => {
    const req = makeRequest({ isPremium: true })
    const res = await patchPremium(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when isPremium is not boolean', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'admin1',
      isAdmin: true,
    } as unknown as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>)

    const mockDoc = { exists: true, get: vi.fn(() => true) }
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn(),
      })),
    } as never)

    const req = makeRequest({ isPremium: 42 }, 'valid-token')
    const res = await patchPremium(req, makeContext({ userId: 'user1' }))
    expect(res.status).toBe(400)
  })
})

describe('Admin dish-requests route', () => {
  it('returns 401 when no token is provided', async () => {
    const req = makeRequest({ action: 'approve' })
    const res = await patchDishRequest(req, makeContext({ id: 'req1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid action', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'admin1',
      isAdmin: true,
    } as unknown as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>)

    const mockDoc = { exists: true, get: vi.fn(() => true) }
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn(),
      })),
    } as never)

    const req = makeRequest({ action: 'destroy' }, 'valid-token')
    const res = await patchDishRequest(req, makeContext({ id: 'req1' }))
    expect(res.status).toBe(400)
  })
})
