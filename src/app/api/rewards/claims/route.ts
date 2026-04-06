import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { getUserClaims } from '@/lib/services/coupon'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await getUserClaims(auth.userId)
    return NextResponse.json({ items: claims })
  } catch (error) {
    captureError(error, { route: '/api/rewards/claims', userId: auth.userId })
    return NextResponse.json({ message: 'Failed to fetch claims' }, { status: 500 })
  }
}
