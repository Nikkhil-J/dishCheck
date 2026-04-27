import { NextResponse } from 'next/server'
import { searchRestaurants } from '@/lib/services/catalog'
import type { RestaurantSortOption } from '@/lib/services/catalog'
import { getRequestAuth } from '@/lib/services/request-auth'
import { captureError } from '@/lib/monitoring/sentry'
import { API_ERRORS } from '@/lib/constants/errors'

const VALID_SORT: RestaurantSortOption[] = ['most-reviewed', 'newest', 'alphabetical']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const city = searchParams.get('city')
  const area = searchParams.get('area')
  const cuisine = searchParams.get('cuisine')
  const cursor = searchParams.get('cursor')
  const sortByRaw = searchParams.get('sortBy')
  const sortBy = VALID_SORT.includes(sortByRaw as RestaurantSortOption)
    ? (sortByRaw as RestaurantSortOption)
    : undefined
  const limitParam = Number(searchParams.get('limit'))
  const auth = await getRequestAuth(req)
  const userCity = auth?.userCity ?? null

  try {
    const result = await searchRestaurants({
      query: q,
      city,
      userCity,
      area,
      cuisine,
      sortBy,
      cursorId: cursor,
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    captureError(error, { route: '/api/restaurants' })
    return NextResponse.json({ message: API_ERRORS.FAILED_TO_FETCH_DATA }, { status: 500 })
  }
}

