import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/firebase/config'
import type { Coupon, CouponClaim } from '@/lib/types/rewards'
import type { CreateCouponParams, CouponRepository } from '@/lib/repositories/couponRepository'

function couponDocToModel(id: string, data: FirebaseFirestore.DocumentData): Coupon {
  const toIso = (v: unknown): string => {
    if (!v) return new Date(0).toISOString()
    if (v instanceof Timestamp) return v.toDate().toISOString()
    if (typeof v === 'string') return v
    return new Date(0).toISOString()
  }

  return {
    id,
    title: data.title as string,
    restaurantId: data.restaurantId as string,
    restaurantName: data.restaurantName as string,
    discountValue: data.discountValue as number,
    discountType: data.discountType as 'flat' | 'percent',
    pointsCost: data.pointsCost as number,
    totalStock: data.totalStock as number,
    claimedCount: (data.claimedCount as number) ?? 0,
    isActive: data.isActive as boolean,
    expiresAt: data.expiresAt ? toIso(data.expiresAt) : null,
    createdAt: toIso(data.createdAt),
  }
}

function claimDocToModel(id: string, data: FirebaseFirestore.DocumentData): CouponClaim {
  const toIso = (v: unknown): string => {
    if (!v) return new Date(0).toISOString()
    if (v instanceof Timestamp) return v.toDate().toISOString()
    if (typeof v === 'string') return v
    return new Date(0).toISOString()
  }

  return {
    id,
    userId: data.userId as string,
    couponId: data.couponId as string,
    couponTitle: data.couponTitle as string,
    code: data.code as string,
    isRedeemed: (data.isRedeemed as boolean) ?? false,
    claimedAt: toIso(data.claimedAt),
    expiresAt: data.expiresAt ? toIso(data.expiresAt) : null,
  }
}

export class FirebaseCouponRepository implements CouponRepository {
  private couponsCol() {
    return adminDb.collection(COLLECTIONS.COUPONS)
  }

  private claimsCol(userId: string) {
    return adminDb
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(SUBCOLLECTIONS.COUPON_CLAIMS)
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    const snap = await this.couponsCol()
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get()

    return snap.docs
      .map((d) => couponDocToModel(d.id, d.data()))
      .filter((c) => c.claimedCount < c.totalStock)
  }

  async getById(couponId: string): Promise<Coupon | null> {
    const snap = await this.couponsCol().doc(couponId).get()
    const data = snap.data()
    if (!snap.exists || !data) return null
    return couponDocToModel(snap.id, data)
  }

  async create(params: CreateCouponParams): Promise<Coupon> {
    const now = Timestamp.now()
    const couponRef = this.couponsCol().doc()

    const couponData = {
      title: params.title,
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      discountValue: params.discountValue,
      discountType: params.discountType,
      pointsCost: params.pointsCost,
      totalStock: params.totalStock,
      claimedCount: 0,
      isActive: true,
      codes: params.codes,
      expiresAt: params.expiresAt ? Timestamp.fromDate(new Date(params.expiresAt)) : null,
      createdAt: now,
    }

    await couponRef.set(couponData)

    return {
      id: couponRef.id,
      title: params.title,
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      discountValue: params.discountValue,
      discountType: params.discountType,
      pointsCost: params.pointsCost,
      totalStock: params.totalStock,
      claimedCount: 0,
      isActive: true,
      expiresAt: params.expiresAt,
      createdAt: now.toDate().toISOString(),
    }
  }

  async deactivate(couponId: string): Promise<boolean> {
    try {
      await this.couponsCol().doc(couponId).update({ isActive: false })
      return true
    } catch {
      return false
    }
  }

  async claimCouponInTx(
    tx: Transaction,
    userId: string,
    couponId: string,
  ): Promise<{ claim: CouponClaim; pointsCost: number }> {
    const couponRef = this.couponsCol().doc(couponId)
    const claimRef = this.claimsCol(userId).doc()
    const now = Timestamp.now()

    const couponSnap = await tx.get(couponRef)
    if (!couponSnap.exists) throw new Error('COUPON_NOT_FOUND')

    const coupon = couponSnap.data()
    if (!coupon) throw new Error('COUPON_NOT_FOUND')
    if (!coupon.isActive) throw new Error('COUPON_INACTIVE')

    const claimedCount = (coupon.claimedCount as number) ?? 0
    const totalStock = coupon.totalStock as number
    const codes = (coupon.codes as string[]) ?? []

    if (claimedCount >= totalStock || claimedCount >= codes.length) {
      throw new Error('COUPON_EXHAUSTED')
    }

    const code = codes[claimedCount]

    tx.update(couponRef, {
      claimedCount: FieldValue.increment(1),
    })

    const claimData = {
      userId,
      couponId,
      couponTitle: coupon.title as string,
      code,
      isRedeemed: false,
      claimedAt: now,
      expiresAt: coupon.expiresAt ?? null,
    }

    tx.set(claimRef, claimData)

    const claim: CouponClaim = {
      id: claimRef.id,
      userId,
      couponId,
      couponTitle: coupon.title as string,
      code,
      isRedeemed: false,
      claimedAt: now.toDate().toISOString(),
      expiresAt: coupon.expiresAt
        ? (coupon.expiresAt as Timestamp).toDate().toISOString()
        : null,
    }

    return { claim, pointsCost: coupon.pointsCost as number }
  }

  async claimCoupon(userId: string, couponId: string): Promise<CouponClaim> {
    const couponRef = this.couponsCol().doc(couponId)
    const claimRef = this.claimsCol(userId).doc()
    const now = Timestamp.now()

    const claim = await adminDb.runTransaction(async (tx) => {
      const couponSnap = await tx.get(couponRef)
      if (!couponSnap.exists) throw new Error('COUPON_NOT_FOUND')

      const coupon = couponSnap.data()
      if (!coupon) throw new Error('COUPON_NOT_FOUND')
      if (!coupon.isActive) throw new Error('COUPON_INACTIVE')

      const claimedCount = (coupon.claimedCount as number) ?? 0
      const totalStock = coupon.totalStock as number
      const codes = (coupon.codes as string[]) ?? []

      if (claimedCount >= totalStock || claimedCount >= codes.length) {
        throw new Error('COUPON_EXHAUSTED')
      }

      const code = codes[claimedCount]

      tx.update(couponRef, {
        claimedCount: FieldValue.increment(1),
      })

      const claimData = {
        userId,
        couponId,
        couponTitle: coupon.title as string,
        code,
        isRedeemed: false,
        claimedAt: now,
        expiresAt: coupon.expiresAt ?? null,
      }

      tx.set(claimRef, claimData)

      return {
        id: claimRef.id,
        userId,
        couponId,
        couponTitle: coupon.title as string,
        code,
        isRedeemed: false,
        claimedAt: now.toDate().toISOString(),
        expiresAt: coupon.expiresAt
          ? (coupon.expiresAt as Timestamp).toDate().toISOString()
          : null,
      } satisfies CouponClaim
    })

    return claim
  }

  async getUserClaims(userId: string): Promise<CouponClaim[]> {
    const snap = await this.claimsCol(userId)
      .orderBy('claimedAt', 'desc')
      .get()

    return snap.docs.map((d) => claimDocToModel(d.id, d.data()))
  }
}
