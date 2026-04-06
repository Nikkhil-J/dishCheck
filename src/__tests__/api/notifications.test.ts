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
    COUPONS: 'coupons',
  },
  SUBCOLLECTIONS: {
    WISHLIST: 'wishlist',
    POINT_TRANSACTIONS: 'pointTransactions',
    COUPON_CLAIMS: 'couponClaims',
  },
}))

vi.mock('@/lib/firebase/admin-server', () => ({
  adminAuth: {},
  adminDb: {},
}))

vi.mock('@/lib/auth/firebase-auth-provider', () => ({
  FirebaseAuthProvider: vi.fn().mockImplementation(() => ({
    verifyToken: vi.fn(),
  })),
}))

vi.mock('@/lib/services/request-auth', () => ({
  getRequestAuth: vi.fn(),
}))

vi.mock('@/lib/repositories', () => ({
  notificationRepository: {
    getById: vi.fn(),
    markRead: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/typesense/typesenseClient', () => ({
  isTypesenseConfigured: vi.fn().mockReturnValue(false),
  getTypesenseClient: vi.fn(),
}))

import { getRequestAuth } from '@/lib/services/request-auth'
import { notificationRepository } from '@/lib/repositories'
import { POST as markNotificationRead } from '@/app/api/notifications/[id]/read/route'

function makeRequest(method: string): Request {
  const headers = new Headers({
    'content-type': 'application/json',
    authorization: 'Bearer test-token',
  })
  return new Request('http://localhost/api/notifications/notif-1/read', { method, headers })
}

function makeContext<T>(params: T) {
  return { params: Promise.resolve(params) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/notifications/[id]/read', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('POST')
    const res = await markNotificationRead(req, makeContext({ id: 'notif-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when notification does not exist', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(notificationRepository.getById).mockResolvedValue(null)

    const req = makeRequest('POST')
    const res = await markNotificationRead(req, makeContext({ id: 'notif-missing' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when notification belongs to a different user', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(notificationRepository.getById).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-other',
      type: 'helpful_vote',
      title: 'Helpful vote',
      message: 'Someone found your review helpful',
      linkUrl: null,
      isRead: false,
      createdAt: '2025-01-01T00:00:00Z',
    })

    const req = makeRequest('POST')
    const res = await markNotificationRead(req, makeContext({ id: 'notif-1' }))
    expect(res.status).toBe(403)
    expect(notificationRepository.markRead).not.toHaveBeenCalled()
  })

  it('returns 200 when caller owns the notification', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(notificationRepository.getById).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: 'helpful_vote',
      title: 'Helpful vote',
      message: 'Someone found your review helpful',
      linkUrl: null,
      isRead: false,
      createdAt: '2025-01-01T00:00:00Z',
    })
    vi.mocked(notificationRepository.markRead).mockResolvedValue(true)

    const req = makeRequest('POST')
    const res = await markNotificationRead(req, makeContext({ id: 'notif-1' }))
    expect(res.status).toBe(200)
    expect(notificationRepository.markRead).toHaveBeenCalledWith('notif-1')
  })
})
