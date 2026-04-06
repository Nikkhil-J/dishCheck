import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTx = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}

const mockUserDocRef = { id: 'user-ref', path: 'users/user-1' }

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
  adminDb: {
    runTransaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockUserDocRef),
    })),
  },
}))

vi.mock('@/lib/repositories', () => ({
  userRepository: {
    getById: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/server', () => ({
  couponRepository: {
    getActiveCoupons: vi.fn(),
    getById: vi.fn(),
    claimCoupon: vi.fn(),
    claimCouponInTx: vi.fn(),
    getUserClaims: vi.fn(),
  },
  pointsRepository: {
    getBalance: vi.fn(),
    appendTransaction: vi.fn(),
    appendTransactionInTx: vi.fn(),
    getTransactions: vi.fn(),
  },
}))

vi.mock('@/lib/auth/firebase-auth-provider', () => ({
  FirebaseAuthProvider: vi.fn().mockImplementation(() => ({
    verifyToken: vi.fn(),
  })),
}))

import { couponRepository, pointsRepository } from '@/lib/repositories/server'
import {
  claimCoupon,
  getCouponCatalogue,
  getUserClaims,
  CouponServiceError,
} from '@/lib/services/coupon'
import type { Coupon, CouponClaim } from '@/lib/types/rewards'

const MOCK_COUPON: Coupon = {
  id: 'coupon-1',
  title: '₹50 off at Biryani Blues',
  restaurantId: 'rest-1',
  restaurantName: 'Biryani Blues',
  discountValue: 50,
  discountType: 'flat',
  pointsCost: 500,
  totalStock: 10,
  claimedCount: 3,
  isActive: true,
  expiresAt: null,
  createdAt: '2025-01-01T00:00:00Z',
}

const MOCK_CLAIM: CouponClaim = {
  id: 'claim-1',
  userId: 'user-1',
  couponId: 'coupon-1',
  couponTitle: '₹50 off at Biryani Blues',
  code: 'DISH50-ABC123',
  isRedeemed: false,
  claimedAt: '2025-06-01T00:00:00Z',
  expiresAt: null,
}

function mockUserSnap(balance: number) {
  return { exists: true, data: () => ({ dishPointsBalance: balance }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTx.get.mockResolvedValue(mockUserSnap(600))
})

describe('getCouponCatalogue', () => {
  it('returns active coupons from repository', async () => {
    vi.mocked(couponRepository.getActiveCoupons).mockResolvedValue([MOCK_COUPON])

    const result = await getCouponCatalogue()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('coupon-1')
  })
})

describe('getUserClaims', () => {
  it('returns user claims from repository', async () => {
    vi.mocked(couponRepository.getUserClaims).mockResolvedValue([MOCK_CLAIM])

    const result = await getUserClaims('user-1')
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('DISH50-ABC123')
  })
})

describe('claimCoupon', () => {
  it('throws 404 when coupon not found', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockRejectedValue(
      new Error('COUPON_NOT_FOUND'),
    )

    await expect(claimCoupon('user-1', 'missing')).rejects.toThrow(CouponServiceError)
    await expect(claimCoupon('user-1', 'missing')).rejects.toThrow('Coupon not found')
  })

  it('throws 409 when coupon is inactive', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockRejectedValue(
      new Error('COUPON_INACTIVE'),
    )

    await expect(claimCoupon('user-1', 'coupon-1')).rejects.toThrow('no longer available')
  })

  it('throws 409 when coupon stock is exhausted', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockRejectedValue(
      new Error('COUPON_EXHAUSTED'),
    )

    await expect(claimCoupon('user-1', 'coupon-1')).rejects.toThrow('stock exhausted')
  })

  it('throws 400 when user has insufficient balance', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockResolvedValue({
      claim: MOCK_CLAIM,
      pointsCost: 500,
    })
    mockTx.get.mockResolvedValue(mockUserSnap(200))

    await expect(claimCoupon('user-1', 'coupon-1')).rejects.toThrow('Insufficient DishPoints')
  })

  it('claims coupon and deducts points on success', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockResolvedValue({
      claim: MOCK_CLAIM,
      pointsCost: 500,
    })
    mockTx.get.mockResolvedValue(mockUserSnap(600))

    const result = await claimCoupon('user-1', 'coupon-1')

    expect(result.code).toBe('DISH50-ABC123')
    expect(couponRepository.claimCouponInTx).toHaveBeenCalledWith(
      mockTx,
      'user-1',
      'coupon-1',
    )
    expect(pointsRepository.appendTransactionInTx).toHaveBeenCalledWith(
      mockTx,
      {
        userId: 'user-1',
        type: 'REDEMPTION',
        points: -500,
        refId: 'claim-1',
        description: 'Redeemed: ₹50 off at Biryani Blues',
      },
      600,
    )
  })

  it('succeeds when user has exactly pointsCost balance', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockResolvedValue({
      claim: MOCK_CLAIM,
      pointsCost: 500,
    })
    mockTx.get.mockResolvedValue(mockUserSnap(500))

    const result = await claimCoupon('user-1', 'coupon-1')

    expect(result.code).toBe('DISH50-ABC123')
    expect(pointsRepository.appendTransactionInTx).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ points: -500 }),
      500,
    )
  })

  it('should not deduct points if coupon claim fails mid-transaction', async () => {
    vi.mocked(couponRepository.claimCouponInTx).mockRejectedValue(
      new Error('COUPON_EXHAUSTED'),
    )

    await expect(claimCoupon('user-1', 'coupon-1')).rejects.toThrow('stock exhausted')
    expect(pointsRepository.appendTransactionInTx).not.toHaveBeenCalled()
  })
})
