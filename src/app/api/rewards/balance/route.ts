import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { getPointsBalance } from '@/lib/services/rewards'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const balance = await getPointsBalance(auth.userId)
    return NextResponse.json(balance)
  } catch (error) {
    captureError(error, { route: '/api/rewards/balance', userId: auth.userId })
    return NextResponse.json({ message: 'Failed to fetch balance' }, { status: 500 })
  }
}
