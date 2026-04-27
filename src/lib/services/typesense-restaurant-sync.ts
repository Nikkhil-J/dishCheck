import 'server-only'

import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { isTypesenseConfigured, getTypesenseClient } from '@/lib/repositories/typesense/typesenseClient'
import { captureError } from '@/lib/monitoring/sentry'

export async function syncRestaurantToTypesense(restaurantId: string): Promise<void> {
  if (!isTypesenseConfigured()) return

  try {
    const restaurantSnap = await adminDb
      .collection(COLLECTIONS.RESTAURANTS)
      .doc(restaurantId)
      .get()

    if (!restaurantSnap.exists) return

    const r = restaurantSnap.data()!

    const dishSnap = await adminDb
      .collection(COLLECTIONS.DISHES)
      .where('restaurantId', '==', restaurantId)
      .where('isActive', '==', true)
      .get()

    const dishNames: string[] = []
    let totalReviews = 0
    for (const d of dishSnap.docs) {
      const data = d.data()
      if (data.name) dishNames.push(data.name as string)
      totalReviews += (data.reviewCount as number) ?? 0
    }

    const createdAt = r.createdAt?.toDate?.()
    const document = {
      id: restaurantId,
      name: (r.name as string) ?? '',
      nameLower: ((r.name as string) ?? '').toLowerCase(),
      city: (r.city as string) ?? '',
      area: (r.area as string) ?? '',
      cuisines: (r.cuisines as string[]) ?? [],
      coverImage: (r.coverImage as string) ?? '',
      dishNames,
      dishCount: dishSnap.size,
      totalReviews,
      isActive: (r.isActive as boolean) ?? true,
      createdAt: createdAt ? Math.floor(createdAt.getTime() / 1000) : 0,
    }

    await getTypesenseClient()
      .collections('restaurants')
      .documents()
      .upsert(document)
  } catch (e) {
    captureError(e, {
      route: 'typesense-restaurant-sync',
      extra: { restaurantId },
    })
  }
}
