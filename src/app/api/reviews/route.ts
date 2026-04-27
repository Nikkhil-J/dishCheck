import { NextResponse } from 'next/server'
import { userRepository, dishRepository } from '@/lib/repositories'
import { reviewRepository } from '@/lib/repositories/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { parseBody } from '@/lib/validation'
import { createReviewSchema } from '@/lib/validation/review.schema'
import { rewardPointsForReview } from '@/lib/services/rewards'
import { REVIEW_FULL_MIN_TEXT_LENGTH } from '@/lib/types/rewards'
import { captureError, addBreadcrumb, logRouteDuration } from '@/lib/monitoring/sentry'
import { checkRateLimit } from '@/lib/rate-limit'
import { isTypesenseConfigured, getTypesenseClient } from '@/lib/repositories/typesense/typesenseClient'
import { syncRestaurantToTypesense } from '@/lib/services/typesense-restaurant-sync'
import { invalidateAnalyticsCache } from '@/lib/services/analytics-cache'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { API_ERRORS } from '@/lib/constants/errors'

export async function POST(req: Request) {
  const start = Date.now()
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ message: API_ERRORS.UNAUTHORIZED }, { status: 401 })

  const rateLimited = await checkRateLimit(auth.userId, 'REVIEW_CREATE')
  if (rateLimited) return rateLimited

  const parsed = parseBody(createReviewSchema, await req.json())
  if (!parsed.success) return parsed.response

  const { data: body } = parsed

  // Full User document is required here: reviewRepository.create() needs displayName, level,
  // and avatarUrl for review denormalization, and dishPointsBalance is used in the response.
  // These fields are not available on the auth token, so this fetch cannot be eliminated.
  const user = await userRepository.getById(auth.userId)
  if (!user) return NextResponse.json({ message: API_ERRORS.USER_NOT_FOUND }, { status: 404 })

  try {
    const result = await reviewRepository.create(
      {
        dishId: body.dishId,
        restaurantId: body.restaurantId,
        photoFile: null,
        photoPreviewUrl: body.photoUrl ?? null,
        billFile: null,
        billPreviewUrl: body.billUrl ?? null,
        tasteRating: body.tasteRating,
        portionRating: body.portionRating,
        valueRating: body.valueRating,
        tags: body.tags,
        text: body.text,
      },
      user,
      body.photoUrl ?? ''
    )
    if (!result) return NextResponse.json({ message: API_ERRORS.FAILED_TO_CREATE_REVIEW }, { status: 500 })

    addBreadcrumb('Review created', { reviewId: result.id, dishId: body.dishId })

    let pointsAwarded = 0
    let newBalance = user.dishPointsBalance
    try {
      const rewards = await rewardPointsForReview(auth.userId, result.id, {
        hasPhoto: !!body.photoUrl,
        hasTags: body.tags.length > 0,
        textLength: body.text.length,
        text: body.text,
        userId: auth.userId,
      })
      pointsAwarded = rewards.totalPointsAwarded
      newBalance = user.dishPointsBalance + pointsAwarded
      addBreadcrumb('Points awarded', { reviewId: result.id, pointsAwarded })
    } catch (rewardErr) {
      captureError(rewardErr, {
        userId: auth.userId,
        route: '/api/reviews',
        extra: { reviewId: result.id, phase: 'points-accrual' },
      })
    }

    try {
      if (body.photoUrl) {
        const dish = await dishRepository.getById(body.dishId)
        if (dish && !dish.coverImage) {
          await adminDb
            .collection(COLLECTIONS.DISHES)
            .doc(body.dishId)
            .update({ coverImage: body.photoUrl })
        }
      }
    } catch (coverImageError) {
      captureError(coverImageError, {
        route: 'POST /api/reviews',
        extra: { context: 'auto-set cover image' },
        userId: auth.userId,
      })
    }

    if (isTypesenseConfigured()) {
      dishRepository.getById(body.dishId).then((dish) => {
        if (!dish) return
        return getTypesenseClient()
          .collections('dishes')
          .documents(dish.id)
          .update({
            avgOverall: dish.avgOverall,
            avgTaste: dish.avgTaste,
            avgPortion: dish.avgPortion,
            avgValue: dish.avgValue,
            reviewCount: dish.reviewCount,
          })
      }).catch((err) => captureError(err, { route: '/api/reviews', extra: { phase: 'typesense-sync' } }))
    }

    syncRestaurantToTypesense(body.restaurantId).catch((err) =>
      captureError(err, { route: '/api/reviews', extra: { phase: 'typesense-restaurant-sync' } }),
    )

    invalidateAnalyticsCache(body.restaurantId).catch((err) =>
      captureError(err, { route: '/api/reviews', extra: { phase: 'analytics-cache-invalidation' } }),
    )

    logRouteDuration('/api/reviews', Date.now() - start, auth.userId)
    return NextResponse.json({
      item: result,
      pointsAwarded,
      newBalance,
      isFullReview: !!body.photoUrl && body.tags.length > 0 && body.text.length >= REVIEW_FULL_MIN_TEXT_LENGTH,
    }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : API_ERRORS.FAILED_TO_CREATE_REVIEW
    if (message === 'You have already reviewed this dish') {
      return NextResponse.json({ message: API_ERRORS.ALREADY_REVIEWED }, { status: 409 })
    }
    captureError(e, {
      userId: auth.userId,
      route: '/api/reviews',
      requestBody: { dishId: body.dishId, restaurantId: body.restaurantId },
    })
    return NextResponse.json({ message }, { status: 400 })
  }
}
