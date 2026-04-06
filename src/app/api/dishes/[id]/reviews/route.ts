import { NextResponse } from 'next/server'
import { listDishReviews } from '@/lib/services/catalog'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const result = await listDishReviews(id, cursor)
  return NextResponse.json(result)
}

