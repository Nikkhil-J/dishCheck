import { NextResponse } from 'next/server'
import { userRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'
import { claimCoupon, CouponServiceError } from '@/lib/services/coupon'
import { createServerNotification } from '@/lib/services/notifications-server'
import { sendCouponClaimedEmail } from '@/lib/services/email'
import { parseBody } from '@/lib/validation'
import { redeemCouponSchema } from '@/lib/validation/coupon.schema'
import { captureError, logRouteDuration } from '@/lib/monitoring/sentry'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const start = Date.now()
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'REDEEM')
  if (rateLimited) return rateLimited

  const parsed = parseBody(redeemCouponSchema, await req.json())
  if (!parsed.success) return parsed.response

  try {
    const claim = await claimCoupon(auth.userId, parsed.data.couponId)

    createServerNotification(
      auth.userId,
      'system',
      'Coupon redeemed!',
      'Your coupon has been redeemed successfully. Check your rewards page for details.',
      '/rewards'
    ).catch((e) => captureError(e, { route: '/api/rewards/redeem', extra: { context: 'notification' } }))

    userRepository.getById(auth.userId).then((user) => {
      if (!user?.email) return
      return sendCouponClaimedEmail(
        { email: user.email, displayName: user.displayName },
        claim,
      )
    }).catch((err) => captureError(err, { extra: { phase: 'coupon-claimed-email' } }))

    logRouteDuration('/api/rewards/redeem', Date.now() - start, auth.userId)
    return NextResponse.json({ claim }, { status: 201 })
  } catch (error) {
    captureError(error, {
      userId: auth.userId,
      route: '/api/rewards/redeem',
      extra: { couponId: parsed.data.couponId },
    })

    if (error instanceof CouponServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (error instanceof Error) {
      if (error.message === 'COUPON_EXHAUSTED') {
        return NextResponse.json({ message: 'Coupon no longer available' }, { status: 409 })
      }
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ message: 'Insufficient DishPoints' }, { status: 400 })
      }
    }
    return NextResponse.json({ message: 'Failed to redeem coupon' }, { status: 500 })
  }
}
