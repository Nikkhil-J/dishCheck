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

vi.mock('@/lib/repositories', () => ({
  reviewRepository: {
    getRecentByUser: vi.fn().mockResolvedValue([]),
  },
  userRepository: {
    getById: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/server', () => ({
  pointsRepository: {
    appendTransaction: vi.fn(),
    getBalance: vi.fn(),
    getTransactions: vi.fn(),
  },
}))

vi.mock('@/lib/services/email', () => ({
  sendPointsMilestoneEmail: vi.fn().mockResolvedValue(undefined),
  sendCouponClaimedEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/auth/firebase-auth-provider', () => ({
  FirebaseAuthProvider: vi.fn().mockImplementation(() => ({
    verifyToken: vi.fn(),
  })),
}))

import { userRepository } from '@/lib/repositories'
import { pointsRepository } from '@/lib/repositories/server'

import { rewardPointsForReview, getPointsBalance, _computeReviewPoints } from '@/lib/services/rewards'
import { sendPointsMilestoneEmail } from '@/lib/services/email'
import type { DishPointTransaction } from '@/lib/types/rewards'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('_computeReviewPoints', () => {
  it('returns REVIEW_FULL (25 pts) for photo + tags + text >= 30 chars with quality text', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: true,
      hasTags: true,
      textLength: 52,
      text: 'This butter chicken was absolutely amazing and fresh',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_FULL')
    expect(result.points).toBe(25)
  })

  it('returns REVIEW_BASIC (10 pts) for photo + tags only', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: true,
      hasTags: true,
      textLength: 10,
      text: 'Great dish',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_BASIC')
    expect(result.points).toBe(10)
  })

  it('returns REVIEW_BASIC (10 pts) for minimal review', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: false,
      hasTags: false,
      textLength: 0,
      text: '',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_BASIC')
    expect(result.points).toBe(10)
  })

  it('returns REVIEW_BASIC if photo but no tags', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: true,
      hasTags: false,
      textLength: 50,
      text: 'This was a decent meal with interesting flavors overall',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_BASIC')
    expect(result.points).toBe(10)
  })

  it('returns REVIEW_BASIC if tags but no photo', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: false,
      hasTags: true,
      textLength: 50,
      text: 'This was a decent meal with interesting flavors overall',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_BASIC')
    expect(result.points).toBe(10)
  })
})

describe('rewardPointsForReview', () => {
  it('creates a single transaction for a basic review', async () => {
    const mockTx: DishPointTransaction = {
      id: 'tx-1',
      userId: 'user-1',
      type: 'REVIEW_BASIC',
      points: 10,
      refId: 'review-1',
      description: 'Review submitted',
      createdAt: '2025-06-01T00:00:00Z',
    }

    vi.mocked(pointsRepository.appendTransaction).mockResolvedValue(mockTx)
    vi.mocked(pointsRepository.getTransactions).mockResolvedValue({
      items: [mockTx],
      nextCursor: null,
    })
    vi.mocked(pointsRepository.getBalance).mockResolvedValue({
      balance: 10,
      totalEarned: 10,
      totalRedeemed: 0,
    })

    const result = await rewardPointsForReview('user-1', 'review-1', {
      hasPhoto: false,
      hasTags: false,
      textLength: 0,
      text: '',
      userId: 'user-1',
    })

    expect(result.transactions).toHaveLength(1)
    expect(result.totalPointsAwarded).toBe(10)
    expect(pointsRepository.appendTransaction).toHaveBeenCalledTimes(1)
  })

  it('creates a single transaction for a full review (25 pts)', async () => {
    const mockTx: DishPointTransaction = {
      id: 'tx-1',
      userId: 'user-1',
      type: 'REVIEW_FULL',
      points: 25,
      refId: 'review-1',
      description: 'Full review: photo + tags + text (35 chars)',
      createdAt: '2025-06-01T00:00:00Z',
    }

    vi.mocked(pointsRepository.appendTransaction).mockResolvedValue(mockTx)
    vi.mocked(pointsRepository.getTransactions).mockResolvedValue({
      items: [mockTx],
      nextCursor: null,
    })
    vi.mocked(pointsRepository.getBalance).mockResolvedValue({
      balance: 25,
      totalEarned: 25,
      totalRedeemed: 0,
    })

    const result = await rewardPointsForReview('user-1', 'review-1', {
      hasPhoto: true,
      hasTags: true,
      textLength: 52,
      text: 'This butter chicken was absolutely amazing and fresh',
      userId: 'user-1',
    })

    expect(result.transactions).toHaveLength(1)
    expect(result.totalPointsAwarded).toBe(25)
  })

  it('adds streak bonus when 7 consecutive days detected', async () => {
    const baseTx: DishPointTransaction = {
      id: 'tx-new',
      userId: 'user-1',
      type: 'REVIEW_BASIC',
      points: 10,
      refId: 'review-1',
      description: 'Review submitted',
      createdAt: '2025-06-07T12:00:00Z',
    }

    const streakTx: DishPointTransaction = {
      id: 'tx-streak',
      userId: 'user-1',
      type: 'STREAK_BONUS',
      points: 10,
      refId: 'review-1',
      description: '7-day streak bonus (2x)',
      createdAt: '2025-06-07T12:00:00Z',
    }

    vi.mocked(pointsRepository.appendTransaction)
      .mockResolvedValueOnce(baseTx)
      .mockResolvedValueOnce(streakTx)

    // Simulate 7 consecutive days of reviews (most recent first)
    const items: DishPointTransaction[] = Array.from({ length: 7 }, (_, i) => ({
      id: `tx-${i}`,
      userId: 'user-1',
      type: 'REVIEW_BASIC' as const,
      points: 10,
      refId: `review-${i}`,
      description: 'Review submitted',
      createdAt: new Date(
        Date.UTC(2025, 5, 7 - i, 12, 0, 0),
      ).toISOString(),
    }))

    vi.mocked(pointsRepository.getTransactions).mockResolvedValue({
      items,
      nextCursor: null,
    })
    vi.mocked(pointsRepository.getBalance).mockResolvedValue({
      balance: 90,
      totalEarned: 90,
      totalRedeemed: 0,
    })

    const result = await rewardPointsForReview('user-1', 'review-1', {
      hasPhoto: false,
      hasTags: false,
      textLength: 0,
      text: '',
      userId: 'user-1',
    })

    expect(result.transactions).toHaveLength(2)
    expect(result.totalPointsAwarded).toBe(20)
    expect(pointsRepository.appendTransaction).toHaveBeenCalledTimes(2)
  })

  it('calls sendPointsMilestoneEmail when user crosses 450 points', async () => {
    const mockUser = {
      id: 'user-1',
      displayName: 'Test User',
      email: 'test@example.com',
    }

    const mockTx: DishPointTransaction = {
      id: 'tx-1',
      userId: 'user-1',
      type: 'REVIEW_BASIC',
      points: 10,
      refId: 'review-1',
      description: 'Review submitted',
      createdAt: '2025-06-01T00:00:00Z',
    }

    vi.mocked(pointsRepository.appendTransaction).mockResolvedValue(mockTx)
    vi.mocked(pointsRepository.getTransactions).mockResolvedValue({
      items: [mockTx],
      nextCursor: null,
    })
    vi.mocked(pointsRepository.getBalance).mockResolvedValue({
      balance: 455,
      totalEarned: 455,
      totalRedeemed: 0,
    })
    vi.mocked(userRepository.getById).mockResolvedValue(mockUser as never)

    await rewardPointsForReview('user-1', 'review-1', {
      hasPhoto: false,
      hasTags: false,
      textLength: 0,
      text: '',
      userId: 'user-1',
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(sendPointsMilestoneEmail).toHaveBeenCalledWith(
      { email: 'test@example.com', displayName: 'Test User' },
      455,
      45,
    )
  })
})

describe('text quality check for REVIEW_FULL', () => {
  it('downgrades to REVIEW_BASIC for text with <5 distinct words', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: true,
      hasTags: true,
      textLength: 35,
      text: 'aaaaaaaaaaaaaaaaaaaaa aaaaaaaaa bbbb',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_BASIC')
    expect(result.points).toBe(10)
    expect(result.description).toContain('quality')
  })

  it('awards REVIEW_FULL for legitimate text with 5+ distinct words', async () => {
    const result = await _computeReviewPoints({
      hasPhoto: true,
      hasTags: true,
      textLength: 52,
      text: 'This butter chicken was absolutely amazing and fresh',
      userId: 'user-1',
    })
    expect(result.type).toBe('REVIEW_FULL')
    expect(result.points).toBe(25)
  })
})

describe('getPointsBalance', () => {
  it('returns balance from repository', async () => {
    vi.mocked(pointsRepository.getBalance).mockResolvedValue({
      balance: 150,
      totalEarned: 200,
      totalRedeemed: 50,
    })

    const result = await getPointsBalance('user-1')
    expect(result.balance).toBe(150)
    expect(result.totalEarned).toBe(200)
    expect(result.totalRedeemed).toBe(50)
  })
})
