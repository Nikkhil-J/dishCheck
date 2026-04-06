import type { Transaction } from 'firebase-admin/firestore'
import type { Coupon, CouponClaim } from '@/lib/types/rewards'

export interface CreateCouponParams {
  title: string
  restaurantId: string
  restaurantName: string
  discountValue: number
  discountType: 'flat' | 'percent'
  pointsCost: number
  totalStock: number
  expiresAt: string | null
  codes: string[]
}

export interface CouponRepository {
  getActiveCoupons(): Promise<Coupon[]>
  getById(couponId: string): Promise<Coupon | null>
  create(params: CreateCouponParams): Promise<Coupon>
  deactivate(couponId: string): Promise<boolean>
  claimCoupon(userId: string, couponId: string): Promise<CouponClaim>
  claimCouponInTx(
    tx: Transaction,
    userId: string,
    couponId: string,
  ): Promise<{ claim: CouponClaim; pointsCost: number }>
  getUserClaims(userId: string): Promise<CouponClaim[]>
}
