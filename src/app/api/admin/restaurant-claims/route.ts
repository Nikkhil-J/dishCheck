import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { COLLECTIONS } from '@/lib/firebase/config'
import { parseBody } from '@/lib/validation'
import { reviewClaimSchema } from '@/lib/validation/restaurant-claim.schema'
import { captureError } from '@/lib/monitoring/sentry'

export async function GET(req: Request) {
  try {
    await assertAdmin(req)

    const snap = await adminDb
      .collection(COLLECTIONS.RESTAURANT_CLAIMS)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get()

    const claims = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString(),
    }))

    return NextResponse.json({ claims })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    captureError(error, { route: '/api/admin/restaurant-claims' })
    return NextResponse.json({ message: 'Failed to fetch claims' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId: adminUserId } = await assertAdmin(req)

    const body = await req.json()
    const claimId = body?.claimId as string | undefined
    if (!claimId) {
      return NextResponse.json({ message: 'claimId is required' }, { status: 400 })
    }

    const parsed = parseBody(reviewClaimSchema, body)
    if (!parsed.success) return parsed.response

    const claimRef = adminDb.collection(COLLECTIONS.RESTAURANT_CLAIMS).doc(claimId)
    const claimSnap = await claimRef.get()

    if (!claimSnap.exists) {
      return NextResponse.json({ message: 'Claim not found' }, { status: 404 })
    }

    const claim = claimSnap.data()
    if (claim?.status !== 'pending') {
      return NextResponse.json({ message: 'Claim has already been reviewed' }, { status: 409 })
    }

    const restaurantId = claim?.restaurantId as string
    const claimUserId = claim?.userId as string

    if (parsed.data.action === 'approve') {
      const restaurantRef = adminDb.collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
      const restaurantSnap = await restaurantRef.get()
      if (!restaurantSnap.exists) {
        return NextResponse.json({ message: 'Restaurant not found' }, { status: 404 })
      }

      const existingOwnerId = restaurantSnap.data()?.ownerId as string | null | undefined
      if (existingOwnerId) {
        return NextResponse.json(
          { message: 'Restaurant already has an owner' },
          { status: 409 }
        )
      }

      await adminDb.runTransaction(async (tx) => {
        tx.update(claimRef, {
          status: 'approved',
          adminId: adminUserId,
          adminNote: parsed.data.note ?? null,
        })

        tx.update(restaurantRef, {
          ownerId: claimUserId,
          isVerified: true,
        })
      })

      return NextResponse.json({ success: true, action: 'approved' })
    }

    await claimRef.update({
      status: 'rejected',
      adminId: adminUserId,
      adminNote: parsed.data.note ?? '',
    })

    return NextResponse.json({ success: true, action: 'rejected' })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    captureError(error, { route: '/api/admin/restaurant-claims' })
    return NextResponse.json({ message: 'Failed to review claim' }, { status: 500 })
  }
}
