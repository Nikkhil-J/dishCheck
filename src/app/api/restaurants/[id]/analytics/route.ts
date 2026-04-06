import { NextResponse } from 'next/server'
import {
  assertRestaurantOwner,
  RestaurantOwnerAuthError,
} from '@/lib/auth/assert-restaurant-owner'
import { getRestaurantAnalytics } from '@/lib/services/restaurant-analytics'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const { id: restaurantId } = await context.params

  try {
    await assertRestaurantOwner(req, restaurantId)
  } catch (error) {
    if (error instanceof RestaurantOwnerAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    captureError(error, { route: '/api/restaurants/[id]/analytics' })
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const analytics = await getRestaurantAnalytics(restaurantId)
  if (!analytics) {
    return NextResponse.json({ message: 'Restaurant not found' }, { status: 404 })
  }

  return NextResponse.json(analytics)
}
