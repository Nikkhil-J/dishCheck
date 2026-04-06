import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { getPointsHistory } from '@/lib/services/rewards'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
  const cursor = searchParams.get('cursor') ?? undefined

  try {
    const result = await getPointsHistory(auth.userId, limit, cursor)
    return NextResponse.json(result)
  } catch (error) {
    captureError(error, { route: '/api/rewards/transactions', userId: auth.userId })
    return NextResponse.json({ message: 'Failed to fetch transactions' }, { status: 500 })
  }
}
