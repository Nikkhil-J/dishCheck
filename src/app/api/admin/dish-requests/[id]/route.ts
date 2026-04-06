import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin-server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { COLLECTIONS } from '@/lib/firebase/config'
import { parseBody } from '@/lib/validation'
import { dishRequestActionSchema } from '@/lib/validation/admin.schema'
import { createServerNotification } from '@/lib/services/notifications-server'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { userId } = await assertAdmin(req)
    const { id } = await context.params

    const parsed = parseBody(dishRequestActionSchema, await req.json())
    if (!parsed.success) return parsed.response

    const body = parsed.data
    const requestRef = adminDb.collection(COLLECTIONS.DISH_REQUESTS).doc(id)

    if (body.action === 'approve') {
      const result = await adminDb.runTransaction(async (tx) => {
        const requestSnap = await tx.get(requestRef)
        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND')

        const request = requestSnap.data()
        const restaurantId = request?.restaurantId as string | undefined
        const dishName = request?.dishName as string | undefined

        if (!restaurantId || !dishName) {
          throw new Error('INVALID_REQUEST_DATA')
        }

        const restaurantRef = adminDb.collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
        const restaurantSnap = await tx.get(restaurantRef)
        if (!restaurantSnap.exists) throw new Error('RESTAURANT_NOT_FOUND')

        const restaurant = restaurantSnap.data()
        const now = Timestamp.now()
        const dishRef = adminDb.collection(COLLECTIONS.DISHES).doc()

        tx.set(dishRef, {
          restaurantId,
          restaurantName: (request?.restaurantName as string | undefined) ?? '',
          cuisines: (restaurant?.cuisines as string[] | undefined) ?? [],
          area: (restaurant?.area as string | undefined) ?? '',
          name: dishName,
          nameLower: dishName.toLowerCase(),
          description: (request?.description as string | null | undefined) ?? null,
          category: body.category ?? 'Main Course',
          dietary: body.dietary ?? 'veg',
          priceRange: null,
          coverImage: null,
          avgTaste: 0,
          avgPortion: 0,
          avgValue: 0,
          avgOverall: 0,
          reviewCount: 0,
          topTags: [],
          isActive: true,
          createdAt: now,
        })

        tx.update(requestRef, {
          status: 'approved',
          adminId: userId,
          adminNote: null,
        })

        return {
          dishId: dishRef.id,
          requestedBy: request?.requestedBy as string | undefined,
          dishName,
          restaurantName: (request?.restaurantName as string | undefined) ?? '',
        }
      })

      if (result.requestedBy) {
        createServerNotification(
          result.requestedBy,
          'review_approved',
          'Your dish request was approved!',
          `"${result.dishName}" at ${result.restaurantName} is now on DishCheck. Be the first to review it!`,
          `/dish/${result.dishId}`
        ).catch((e) => captureError(e, { route: '/api/admin/dish-requests/[id]', extra: { context: 'notification' } }))
      }

      return NextResponse.json({ success: true, dishId: result.dishId })
    }

    const requestSnap = await requestRef.get()
    const requestData = requestSnap.data()
    const requestedBy = requestData?.requestedBy as string | undefined
    const dishName = requestData?.dishName as string | undefined

    await requestRef.update({
      status: 'rejected',
      adminId: userId,
      adminNote: body.note ?? '',
    })

    if (requestedBy && dishName) {
      createServerNotification(
        requestedBy,
        'system',
        'Dish request update',
        `Your request for "${dishName}" was not approved.${body.note ? ` Note: ${body.note}` : ''}`,
        null
      ).catch((e) => captureError(e, { route: '/api/admin/dish-requests/[id]', extra: { context: 'notification' } }))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    if (error instanceof Error) {
      if (error.message === 'REQUEST_NOT_FOUND') {
        return NextResponse.json({ message: 'Dish request not found' }, { status: 404 })
      }

      if (error.message === 'RESTAURANT_NOT_FOUND') {
        return NextResponse.json({ message: 'Parent restaurant not found' }, { status: 400 })
      }

      if (error.message === 'INVALID_REQUEST_DATA') {
        return NextResponse.json({ message: 'Dish request data is invalid' }, { status: 400 })
      }
    }

    captureError(error, { route: '/api/admin/dish-requests/[id]' })
    return NextResponse.json({ message: 'Failed to update dish request' }, { status: 500 })
  }
}
