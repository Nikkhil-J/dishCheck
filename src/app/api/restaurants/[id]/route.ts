import { NextResponse } from 'next/server'
import { getRestaurantDetails } from '@/lib/services/catalog'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params

  try {
    const restaurant = await getRestaurantDetails(id)
    if (!restaurant) {
      return NextResponse.json({ message: 'Restaurant not found' }, { status: 404 })
    }
    return NextResponse.json({ item: restaurant })
  } catch (error) {
    captureError(error, { route: '/api/restaurants/[id]' })
    return NextResponse.json({ message: 'Failed to fetch data' }, { status: 500 })
  }
}

