import { NextResponse } from 'next/server'
import { listRestaurantDishes } from '@/lib/services/catalog'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params
  const dishes = await listRestaurantDishes(id)
  return NextResponse.json({ items: dishes })
}

