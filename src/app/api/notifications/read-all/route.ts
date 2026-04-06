import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { notificationRepository } from '@/lib/repositories'

export async function POST(req: Request) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const ok = await notificationRepository.markAllRead(auth.userId)
  if (!ok) {
    return NextResponse.json({ message: 'Failed to mark notifications as read' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
