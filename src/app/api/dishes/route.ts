import { NextResponse } from 'next/server'
import { listDishes } from '@/lib/services/catalog'
import { getRequestAuth } from '@/lib/services/request-auth'
import { dishSearchParamsSchema } from '@/lib/validation/dish.schema'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const auth = await getRequestAuth(req)
  const userCity = auth?.userCity ?? null

  const raw = {
    q: searchParams.get('q'),
    city: searchParams.get('city'),
    area: searchParams.get('area'),
    cuisine: searchParams.get('cuisine'),
    dietary: searchParams.get('dietary'),
    priceRange: searchParams.get('priceRange'),
    sortBy: searchParams.get('sortBy') ?? 'highest-rated',
    cursor: searchParams.get('cursor'),
  }

  const parsed = dishSearchParamsSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query parameters', errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const params = parsed.data

  try {
    const result = await listDishes({
      query: params.q,
      city: params.city,
      userCity,
      area: params.area,
      cuisine: params.cuisine,
      dietary: params.dietary,
      priceRange: params.priceRange,
      sortBy: params.sortBy,
      cursorId: params.cursor,
    })

    return NextResponse.json(result)
  } catch (error) {
    captureError(error, { route: '/api/dishes' })
    return NextResponse.json({ message: 'Failed to fetch data' }, { status: 500 })
  }
}
