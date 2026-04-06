import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { COLLECTIONS } from '@/lib/firebase/config'
import { parseBody } from '@/lib/validation'
import { toggleAdminSchema } from '@/lib/validation/admin.schema'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ userId: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await assertAdmin(req)

    const { userId } = await context.params
    const parsed = parseBody(toggleAdminSchema, await req.json())
    if (!parsed.success) return parsed.response

    await adminDb.collection(COLLECTIONS.USERS).doc(userId).update({
      isAdmin: parsed.data.isAdmin,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    captureError(error, { route: '/api/admin/users/[userId]/role' })
    return NextResponse.json({ message: 'Failed to update admin role' }, { status: 500 })
  }
}
