import { NextResponse } from 'next/server'
import { wishlistRepository } from '@/lib/repositories'
import { getRequestAuth } from '@/lib/services/request-auth'

interface RouteContext {
  params: Promise<{ userId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const { userId } = await context.params
  const auth = await getRequestAuth(req)
  if (!auth || auth.userId !== userId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const items = await wishlistRepository.getByUser(userId)
  return NextResponse.json({ items })
}

