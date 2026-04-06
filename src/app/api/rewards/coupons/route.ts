import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { getCouponCatalogue } from '@/lib/services/coupon'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const coupons = await getCouponCatalogue()
    return NextResponse.json({ items: coupons })
  } catch (error) {
    captureError(error, { route: '/api/rewards/coupons', userId: auth.userId })
    return NextResponse.json({ message: 'Failed to fetch coupons' }, { status: 500 })
  }
}
