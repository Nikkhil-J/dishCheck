import { NextResponse } from 'next/server'
import { CITY_AREAS, SUPPORTED_CITIES } from '@/lib/constants'

export async function GET() {
  const payload = SUPPORTED_CITIES.map((city) => ({
    city,
    areas: CITY_AREAS[city] ?? [],
  }))
  return NextResponse.json({ items: payload })
}

