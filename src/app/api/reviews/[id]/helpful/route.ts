import { NextResponse } from 'next/server'
import { reviewRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'
import { createServerNotification } from '@/lib/services/notifications-server'
import { captureError } from '@/lib/monitoring/sentry'
import { checkRateLimit } from '@/lib/rate-limit'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'GENERAL')
  if (rateLimited) return rateLimited

  const { id } = await context.params
  const review = await reviewRepository.getById(id)
  const ok = await reviewRepository.voteHelpful(id, auth.userId)
  if (!ok) return NextResponse.json({ message: 'Failed to vote helpful' }, { status: 400 })

  if (review && review.userId !== auth.userId) {
    createServerNotification(
      review.userId,
      'helpful_vote',
      'Someone found your review helpful!',
      `Your review was marked as helpful.`,
      `/review/${id}`
    ).catch((e) => captureError(e, { route: '/api/reviews/[id]/helpful', extra: { context: 'notification' } }))
  }

  return NextResponse.json({ success: true })
}

