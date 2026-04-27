import { NextResponse } from 'next/server'
import { reviewRepository } from '@/lib/repositories/server'
import { dishRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'
import { parseBody } from '@/lib/validation'
import { updateReviewSchema } from '@/lib/validation/review.schema'
import { checkRateLimit } from '@/lib/rate-limit'
import { syncRestaurantToTypesense } from '@/lib/services/typesense-restaurant-sync'
import { captureError } from '@/lib/monitoring/sentry'
import { API_ERRORS } from '@/lib/constants/errors'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: API_ERRORS.UNAUTHORIZED }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'REVIEW_EDIT')
  if (rateLimited) return rateLimited

  const { id } = await context.params
  const parsed = parseBody(updateReviewSchema, await req.json())
  if (!parsed.success) return parsed.response

  const updated = await reviewRepository.update(id, auth.userId, parsed.data)
  if (!updated) {
    return NextResponse.json({ message: API_ERRORS.FAILED_TO_UPDATE_REVIEW }, { status: 400 })
  }

  if (updated.restaurantId) {
    syncRestaurantToTypesense(updated.restaurantId).catch((err) =>
      captureError(err, { route: 'PATCH /api/reviews/[id]', extra: { phase: 'typesense-restaurant-sync' } }),
    )
  }

  return NextResponse.json({ item: updated })
}

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: API_ERRORS.UNAUTHORIZED }, { status: 401 })

  const { id } = await context.params
  const { searchParams } = new URL(req.url)
  const dishId = searchParams.get('dishId')
  if (!dishId) {
    return NextResponse.json({ message: API_ERRORS.DISH_ID_REQUIRED }, { status: 400 })
  }

  const dish = await dishRepository.getById(dishId)

  const ok = await reviewRepository.delete(id, dishId, auth.userId, auth.isAdmin)
  if (!ok) return NextResponse.json({ message: API_ERRORS.FAILED_TO_DELETE_REVIEW }, { status: 400 })

  if (dish?.restaurantId) {
    syncRestaurantToTypesense(dish.restaurantId).catch((err) =>
      captureError(err, { route: 'DELETE /api/reviews/[id]', extra: { phase: 'typesense-restaurant-sync' } }),
    )
  }

  return NextResponse.json({ success: true })
}
