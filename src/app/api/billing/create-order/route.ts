import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { parseBody } from '@/lib/validation'
import { createOrderSchema } from '@/lib/validation/billing.schema'
import { createOrder } from '@/lib/services/billing'
import { captureError } from '@/lib/monitoring/sentry'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'GENERAL')
  if (rateLimited) return rateLimited

  const parsed = parseBody(createOrderSchema, await req.json())
  if (!parsed.success) return parsed.response

  try {
    const order = await createOrder(parsed.data.plan)
    return NextResponse.json(order)
  } catch (error) {
    captureError(error, { userId: auth.userId, route: '/api/billing/create-order' })
    return NextResponse.json({ message: 'Failed to create order' }, { status: 500 })
  }
}
