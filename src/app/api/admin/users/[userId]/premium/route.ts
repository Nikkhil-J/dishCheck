import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin-server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { COLLECTIONS } from '@/lib/firebase/config'
import { parseBody } from '@/lib/validation'
import { togglePremiumSchema } from '@/lib/validation/admin.schema'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ userId: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await assertAdmin(req)

    const { userId } = await context.params
    const parsed = parseBody(togglePremiumSchema, await req.json())
    if (!parsed.success) return parsed.response

    await adminDb.collection(COLLECTIONS.USERS).doc(userId).update({
      isPremium: parsed.data.isPremium,
      premiumSince: parsed.data.isPremium ? Timestamp.now() : null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    captureError(error, { route: '/api/admin/users/[userId]/premium' })
    return NextResponse.json({ message: 'Failed to update premium role' }, { status: 500 })
  }
}
