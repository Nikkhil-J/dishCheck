import { NextResponse } from 'next/server'
import { assertAdmin, AdminAuthError } from '@/lib/auth/assert-admin'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { isTypesenseConfigured, getTypesenseClient } from '@/lib/repositories/typesense/typesenseClient'
import { captureError } from '@/lib/monitoring/sentry'

export async function POST(req: Request) {
  try {
    await assertAdmin(req)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (!isTypesenseConfigured()) {
    return NextResponse.json(
      { message: 'Typesense is not configured' },
      { status: 503 },
    )
  }

  try {
    const client = getTypesenseClient()
    const snap = await adminDb.collection(COLLECTIONS.DISHES).get()

    const documents = snap.docs.map((doc) => {
      const d = doc.data()
      const createdAt = d.createdAt?.toDate?.()
      return {
        id: doc.id,
        name: (d.name as string) ?? '',
        nameLower: (d.nameLower as string) ?? ((d.name as string) ?? '').toLowerCase(),
        restaurantId: (d.restaurantId as string) ?? '',
        restaurantName: (d.restaurantName as string) ?? '',
        city: (d.city as string) ?? '',
        area: (d.area as string) ?? '',
        cuisines: (d.cuisines as string[]) ?? [],
        description: (d.description as string) ?? '',
        category: (d.category as string) ?? '',
        dietary: (d.dietary as string) ?? 'veg',
        priceRange: (d.priceRange as string) ?? '',
        coverImage: (d.coverImage as string) ?? '',
        avgTaste: (d.avgTaste as number) ?? 0,
        avgPortion: (d.avgPortion as number) ?? 0,
        avgValue: (d.avgValue as number) ?? 0,
        avgOverall: (d.avgOverall as number) ?? 0,
        reviewCount: (d.reviewCount as number) ?? 0,
        topTags: (d.topTags as string[]) ?? [],
        isActive: (d.isActive as boolean) ?? true,
        createdAt: createdAt ? Math.floor(createdAt.getTime() / 1000) : 0,
      }
    })

    const results = await client
      .collections('dishes')
      .documents()
      .import(documents, { action: 'upsert' })

    const failed = results.filter((r: { success: boolean }) => !r.success)
    return NextResponse.json({
      synced: results.length - failed.length,
      failed: failed.length,
      total: snap.size,
    })
  } catch (e) {
    captureError(e, { route: '/api/admin/sync-typesense' })
    const message = e instanceof Error ? e.message : 'Sync failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
