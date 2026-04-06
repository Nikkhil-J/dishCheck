import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/services/request-auth'
import { notificationRepository } from '@/lib/repositories'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const notification = await notificationRepository.getById(id)
  if (!notification) {
    return NextResponse.json({ message: 'Notification not found' }, { status: 404 })
  }
  if (notification.userId !== auth.userId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const ok = await notificationRepository.markRead(id)
  if (!ok) {
    return NextResponse.json({ message: 'Failed to mark notification as read' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
