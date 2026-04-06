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
  reviewRepository: {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    voteHelpful: vi.fn(),
    flag: vi.fn(),
    findByUserAndDish: vi.fn().mockResolvedValue(null),
    getRecentByUser: vi.fn().mockResolvedValue([]),
  },
  userRepository: {
    getById: vi.fn(),
  },
  dishRepository: {
    getById: vi.fn(),
  },
}))

vi.mock('@/lib/services/rewards', () => ({
  rewardPointsForReview: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/repositories/typesense/typesenseClient', () => ({
  isTypesenseConfigured: vi.fn().mockReturnValue(false),
  getTypesenseClient: vi.fn(),
}))

vi.mock('@/lib/services/analytics-cache', () => ({
  invalidateAnalyticsCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/email', () => ({
  sendPointsMilestoneEmail: vi.fn().mockResolvedValue(undefined),
  sendCouponClaimedEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

import { getRequestAuth } from '@/lib/services/request-auth'
import { reviewRepository, userRepository } from '@/lib/repositories'
import { rewardPointsForReview } from '@/lib/services/rewards'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST as createReview } from '@/app/api/reviews/route'
import { PATCH as updateReview, DELETE as deleteReview } from '@/app/api/reviews/[id]/route'
import { POST as voteHelpful } from '@/app/api/reviews/[id]/helpful/route'
import { POST as flagReview } from '@/app/api/reviews/[id]/flag/route'

import type { User } from '@/lib/types'

const MOCK_USER: User = {
  id: 'user-1',
  displayName: 'Test User',
  email: 'test@example.com',
  avatarUrl: null,
  city: 'Bengaluru',
  isAdmin: false,
  isPremium: false,
  premiumSince: null,
  reviewCount: 0,
  helpfulVotesReceived: 0,
  dishPointsBalance: 0,
  totalPointsEarned: 0,
  totalPointsRedeemed: 0,
  level: 'Newbie',
  badges: [],
  createdAt: '2025-01-01T00:00:00Z',
}

function makeRequest(method: string, body?: unknown, url?: string): Request {
  const headers = new Headers({
    'content-type': 'application/json',
    authorization: 'Bearer test-token',
  })
  const init: RequestInit = { method, headers }
  if (body) init.body = JSON.stringify(body)
  return new Request(url || 'http://localhost/api/reviews', init)
}

function makeContext<T>(params: T) {
  return { params: Promise.resolve(params) }
}

const VALID_TEXT = 'This is a detailed review with enough characters to pass validation.'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── POST /api/reviews ─────────────────────────────────────

describe('POST /api/reviews', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
    })
    const res = await createReview(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when body fails validation (missing ratings)', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
    })
    const res = await createReview(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors).toBeDefined()
  })

  it('returns 400 when body fails validation (rating out of range)', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 11,
      portionRating: 3,
      valueRating: 5,
    })
    const res = await createReview(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(null)

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: VALID_TEXT,
    })
    const res = await createReview(req)
    expect(res.status).toBe(404)
  })

  it('returns 201 on successful creation with pointsAwarded', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)
    vi.mocked(reviewRepository.create).mockResolvedValue({
      id: 'review-1',
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      userId: 'user-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      overallRating: 4,
      tags: [],
      text: '',
      photoUrl: null,
      isFlagged: false,
      isApproved: true,
      helpfulVotes: 0,
      helpfulVoters: [],
      userName: 'Test User',
      userAvatar: null,
    } as never)
    vi.mocked(rewardPointsForReview).mockResolvedValue({
      transactions: [],
      totalPointsAwarded: 10,
    })

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: VALID_TEXT,
    })
    const res = await createReview(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.item).toBeDefined()
    expect(body.item.id).toBe('review-1')
    expect(body.pointsAwarded).toBe(10)
    expect(body.newBalance).toBe(10)
  })

  it('still returns 201 if rewards service throws', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)
    vi.mocked(reviewRepository.create).mockResolvedValue({
      id: 'review-1',
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      userId: 'user-1',
    } as never)
    vi.mocked(rewardPointsForReview).mockRejectedValue(new Error('Reward failure'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: VALID_TEXT,
    })
    const res = await createReview(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.item).toBeDefined()
    expect(body.pointsAwarded).toBe(0)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[monitoring]'),
      expect.any(String),
    )

    consoleSpy.mockRestore()
  })

  it('returns 429 after exceeding REVIEW_CREATE limit', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })

    const { NextResponse: RealNextResponse } = await import('next/server')
    vi.mocked(checkRateLimit).mockResolvedValue(
      RealNextResponse.json(
        { message: 'Too many requests', resetAt: Date.now() + 3600_000 },
        { status: 429, headers: { 'Retry-After': '3600' } },
      ),
    )

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: VALID_TEXT,
    })
    const res = await createReview(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.message).toBe('Too many requests')
    expect(body.resetAt).toBeDefined()
    expect(res.headers.get('Retry-After')).toBe('3600')

    vi.mocked(checkRateLimit).mockResolvedValue(null)
  })

  it('returns 409 when user has already reviewed this dish', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)
    vi.mocked(reviewRepository.findByUserAndDish).mockResolvedValue({
      id: 'existing-review-1',
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      userId: 'user-1',
    } as never)

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: VALID_TEXT,
    })
    const res = await createReview(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.message).toBe('You have already reviewed this dish')
    expect(body.existingReviewId).toBe('existing-review-1')

    vi.mocked(reviewRepository.findByUserAndDish).mockResolvedValue(null)
  })

  it('returns isFullReview=true when photo+tags+text>=30', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(userRepository.getById).mockResolvedValue(MOCK_USER)
    vi.mocked(reviewRepository.create).mockResolvedValue({
      id: 'review-2',
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      userId: 'user-1',
    } as never)
    vi.mocked(rewardPointsForReview).mockResolvedValue({
      transactions: [],
      totalPointsAwarded: 25,
    })

    const req = makeRequest('POST', {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      tags: ['Spicy', 'Authentic'],
      text: 'This is a detailed review that is quite long enough.',
      photoUrl: 'https://example.com/photo.jpg',
    })
    const res = await createReview(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.isFullReview).toBe(true)
    expect(body.pointsAwarded).toBe(25)
  })
})

// ── PATCH /api/reviews/:id ────────────────────────────────

describe('PATCH /api/reviews/:id', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('PATCH', { text: 'Updated review' })
    const res = await updateReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when rating is out of range', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })

    const req = makeRequest('PATCH', { tasteRating: 100 })
    const res = await updateReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 on successful update', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(reviewRepository.update).mockResolvedValue({
      id: 'review-1',
      text: 'Updated review',
    } as never)

    const req = makeRequest('PATCH', { text: 'Updated review' })
    const res = await updateReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(200)
  })
})

// ── DELETE /api/reviews/:id ───────────────────────────────

describe('DELETE /api/reviews/:id', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('DELETE', undefined, 'http://localhost/api/reviews/review-1?dishId=dish-1')
    const res = await deleteReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when dishId query param is missing', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })

    const req = makeRequest('DELETE', undefined, 'http://localhost/api/reviews/review-1')
    const res = await deleteReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('dishId')
  })

  it('returns 200 on successful deletion', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(reviewRepository.delete).mockResolvedValue(true)

    const req = makeRequest('DELETE', undefined, 'http://localhost/api/reviews/review-1?dishId=dish-1')
    const res = await deleteReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(200)
  })
})

// ── POST /api/reviews/:id/helpful ─────────────────────────

describe('POST /api/reviews/:id/helpful', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('POST')
    const res = await voteHelpful(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful vote', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(reviewRepository.getById).mockResolvedValue(null)
    vi.mocked(reviewRepository.voteHelpful).mockResolvedValue(true)

    const req = makeRequest('POST')
    const res = await voteHelpful(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(200)
  })
})

// ── POST /api/reviews/:id/flag ────────────────────────────

describe('POST /api/reviews/:id/flag', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue(null)

    const req = makeRequest('POST')
    const res = await flagReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful flag', async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({
      userId: 'user-1',
      isAdmin: false,
      userCity: 'Bengaluru',
    })
    vi.mocked(reviewRepository.flag).mockResolvedValue('ok')

    const req = makeRequest('POST')
    const res = await flagReview(req, makeContext({ id: 'review-1' }))
    expect(res.status).toBe(200)
  })
})

