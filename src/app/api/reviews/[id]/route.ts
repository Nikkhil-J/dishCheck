import { NextResponse } from 'next/server'
import { reviewRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'
import { parseBody } from '@/lib/validation'
import { updateReviewSchema } from '@/lib/validation/review.schema'
import { checkRateLimit } from '@/lib/rate-limit'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'REVIEW_EDIT')
  if (rateLimited) return rateLimited

  const { id } = await context.params
  const parsed = parseBody(updateReviewSchema, await req.json())
  if (!parsed.success) return parsed.response

  const updated = await reviewRepository.update(id, auth.userId, parsed.data)
  if (!updated) {
    return NextResponse.json({ message: 'Failed to update review or unauthorized' }, { status: 400 })
  }
  return NextResponse.json({ item: updated })
}

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { searchParams } = new URL(req.url)
  const dishId = searchParams.get('dishId')
  if (!dishId) {
    return NextResponse.json({ message: 'dishId is required' }, { status: 400 })
  }

  const ok = await reviewRepository.delete(id, dishId, auth.userId, auth.isAdmin)
  if (!ok) return NextResponse.json({ message: 'Failed to delete review or unauthorized' }, { status: 400 })
  return NextResponse.json({ success: true })
}
