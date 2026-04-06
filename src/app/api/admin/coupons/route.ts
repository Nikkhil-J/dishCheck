import { NextResponse } from 'next/server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { couponRepository } from '@/lib/repositories/server'
import { parseBody } from '@/lib/validation'
import { createCouponSchema } from '@/lib/validation/coupon.schema'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  try {
    await assertAdmin(req)
    const coupons = await couponRepository.getActiveCoupons()
    return NextResponse.json({ items: coupons })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    captureError(error, { route: '/api/admin/coupons' })
    return NextResponse.json({ message: 'Failed to fetch coupons' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req)

    const parsed = parseBody(createCouponSchema, await req.json())
    if (!parsed.success) return parsed.response

    const coupon = await couponRepository.create(parsed.data)
    return NextResponse.json({ item: coupon }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    captureError(error, { route: '/api/admin/coupons' })
    return NextResponse.json({ message: 'Failed to create coupon' }, { status: 500 })
  }
}
