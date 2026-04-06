import { NextResponse } from 'next/server'
import { dishRepository, wishlistRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'

interface RouteContext {
  params: Promise<{ userId: string; dishId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const { userId, dishId } = await context.params
  const auth = await getRequestAuth(req)
  if (!auth || auth.userId !== userId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const dish = await dishRepository.getById(dishId)
  if (!dish) {
    return NextResponse.json({ message: 'Dish not found' }, { status: 404 })
  }

  const ok = await wishlistRepository.add(userId, dish)
  if (!ok) return NextResponse.json({ message: 'Failed to save dish' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, context: RouteContext) {
  const { userId, dishId } = await context.params
  const auth = await getRequestAuth(req)
  if (!auth || auth.userId !== userId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const ok = await wishlistRepository.remove(userId, dishId)
  if (!ok) return NextResponse.json({ message: 'Failed to remove dish' }, { status: 500 })
  return NextResponse.json({ success: true })
}

