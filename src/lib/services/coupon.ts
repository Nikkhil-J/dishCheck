import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { couponRepository, pointsRepository } from '@/lib/repositories/server'
import type { Coupon, CouponClaim } from '@/lib/types/rewards'

export class CouponServiceError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function getCouponCatalogue(): Promise<Coupon[]> {
  return couponRepository.getActiveCoupons()
}

export async function getUserClaims(userId: string): Promise<CouponClaim[]> {
  return couponRepository.getUserClaims(userId)
}

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  COUPON_NOT_FOUND: { status: 404, message: 'Coupon not found' },
  COUPON_INACTIVE: { status: 409, message: 'Coupon is no longer available' },
  COUPON_EXHAUSTED: { status: 409, message: 'Coupon stock exhausted' },
  INSUFFICIENT_BALANCE: { status: 400, message: 'Insufficient DishPoints' },
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
}

/**
 * Atomic redemption: coupon claim + points deduction happen in a single
 * Firestore transaction. If any step fails, everything rolls back.
 */
export async function claimCoupon(userId: string, couponId: string): Promise<CouponClaim> {
  try {
    const claim = await adminDb.runTransaction(async (tx) => {
      const { claim: couponClaim, pointsCost } = await couponRepository.claimCouponInTx(
        tx,
        userId,
        couponId,
      )

      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId)
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND')
      }

      const currentBalance = (userSnap.data()?.dishPointsBalance as number | undefined) ?? 0
      if (currentBalance < pointsCost) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      pointsRepository.appendTransactionInTx(
        tx,
        {
          userId,
          type: 'REDEMPTION',
          points: -pointsCost,
          refId: couponClaim.id,
          description: `Redeemed: ${couponClaim.couponTitle}`,
        },
        currentBalance,
      )

      return couponClaim
    })

    return claim
  } catch (error) {
    if (error instanceof CouponServiceError) throw error

    const msg = error instanceof Error ? error.message : String(error)
    const mapped = ERROR_MAP[msg]
    if (mapped) {
      throw new CouponServiceError(mapped.status, mapped.message)
    }

    throw error
  }
}
