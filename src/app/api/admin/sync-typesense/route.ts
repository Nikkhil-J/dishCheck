import { NextResponse } from 'next/server'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { assertAdmin, AdminAuthError } from '@/lib/auth/assert-admin'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { isTypesenseConfigured, getTypesenseClient } from '@/lib/repositories/typesense/typesenseClient'
import { captureError } from '@/lib/monitoring/sentry'
import { API_ERRORS } from '@/lib/constants/errors'

const BATCH_SIZE = 500

function mapDishDoc(doc: QueryDocumentSnapshot) {
  const d = doc.data()
  const createdAt = d.createdAt?.toDate?.()
  return {
    id: doc.id,
    name:           (d.name           as string)   ?? '',
    nameLower:      (d.nameLower      as string)   ?? ((d.name as string) ?? '').toLowerCase(),
    restaurantId:   (d.restaurantId   as string)   ?? '',
    restaurantName: (d.restaurantName as string)   ?? '',
    city:           (d.city           as string)   ?? '',
    area:           (d.area           as string)   ?? '',
    cuisines:       (d.cuisines       as string[]) ?? [],
    description:    (d.description    as string)   ?? '',
    category:       (d.category       as string)   ?? '',
    dietary:        (d.dietary        as string)   ?? 'veg',
    priceRange:     (d.priceRange     as string)   ?? '',
    coverImage:     (d.coverImage     as string)   ?? '',
    avgTaste:       (d.avgTaste       as number)   ?? 0,
    avgPortion:     (d.avgPortion     as number)   ?? 0,
    avgValue:       (d.avgValue       as number)   ?? 0,
    avgOverall:     (d.avgOverall     as number)   ?? 0,
    reviewCount:    (d.reviewCount    as number)   ?? 0,
    topTags:        (d.topTags        as string[]) ?? [],
    isActive:       (d.isActive       as boolean)  ?? true,
    createdAt:      createdAt ? Math.floor(createdAt.getTime() / 1000) : 0,
  }
}

function mapRestaurantDoc(
  doc: QueryDocumentSnapshot,
  dishNames: string[],
  dishCount: number,
  totalReviews: number,
) {
  const r = doc.data()
  const createdAt = r.createdAt?.toDate?.()
  return {
    id: doc.id,
    name:        (r.name       as string)   ?? '',
    nameLower:   ((r.name as string) ?? '').toLowerCase(),
    city:        (r.city       as string)   ?? '',
    area:        (r.area       as string)   ?? '',
    cuisines:    (r.cuisines   as string[]) ?? [],
    coverImage:  (r.coverImage as string)   ?? '',
    dishNames,
    dishCount,
    totalReviews,
    isActive:    (r.isActive   as boolean)  ?? true,
    createdAt:   createdAt ? Math.floor(createdAt.getTime() / 1000) : 0,
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: API_ERRORS.UNAUTHORIZED }, { status: 401 })
  }

  if (!isTypesenseConfigured()) {
    return NextResponse.json({ message: 'Typesense is not configured' }, { status: 503 })
  }

  try {
    const client = getTypesenseClient()

    // --- Sync dishes ---
    let dishesSynced = 0
    let dishesFailed = 0
    let dishesTotal  = 0
    let lastDishDoc: QueryDocumentSnapshot | undefined

    while (true) {
      let q = adminDb
        .collection(COLLECTIONS.DISHES)
        .orderBy('__name__')
        .limit(BATCH_SIZE)

      if (lastDishDoc) q = q.startAfter(lastDishDoc) as typeof q

      const snap = await q.get()
      if (snap.empty) break

      dishesTotal += snap.size
      const documents = snap.docs.map(mapDishDoc)

      const results = await client
        .collections('dishes')
        .documents()
        .import(documents, { action: 'upsert' })

      const batchFailed = results.filter((r: { success: boolean }) => !r.success)
      dishesSynced += results.length - batchFailed.length
      dishesFailed += batchFailed.length

      if (snap.size < BATCH_SIZE) break
      lastDishDoc = snap.docs[snap.docs.length - 1]
    }

    // --- Sync restaurants ---
    let restaurantsSynced = 0
    let restaurantsFailed = 0
    let restaurantsTotal  = 0
    let lastRestDoc: QueryDocumentSnapshot | undefined

    while (true) {
      let q = adminDb
        .collection(COLLECTIONS.RESTAURANTS)
        .orderBy('__name__')
        .limit(BATCH_SIZE)

      if (lastRestDoc) q = q.startAfter(lastRestDoc) as typeof q

      const snap = await q.get()
      if (snap.empty) break

      restaurantsTotal += snap.size

      const documents = await Promise.all(
        snap.docs.map(async (restDoc) => {
          const dishSnap = await adminDb
            .collection(COLLECTIONS.DISHES)
            .where('restaurantId', '==', restDoc.id)
            .where('isActive', '==', true)
            .get()

          const dishNames: string[] = []
          let totalReviews = 0
          for (const d of dishSnap.docs) {
            const data = d.data()
            if (data.name) dishNames.push(data.name as string)
            totalReviews += (data.reviewCount as number) ?? 0
          }

          return mapRestaurantDoc(restDoc, dishNames, dishSnap.size, totalReviews)
        })
      )

      const results = await client
        .collections('restaurants')
        .documents()
        .import(documents, { action: 'upsert' })

      const batchFailed = results.filter((r: { success: boolean }) => !r.success)
      restaurantsSynced += results.length - batchFailed.length
      restaurantsFailed += batchFailed.length

      if (snap.size < BATCH_SIZE) break
      lastRestDoc = snap.docs[snap.docs.length - 1]
    }

    return NextResponse.json({
      dishes: { synced: dishesSynced, failed: dishesFailed, total: dishesTotal },
      restaurants: { synced: restaurantsSynced, failed: restaurantsFailed, total: restaurantsTotal },
    })
  } catch (e) {
    captureError(e, { route: '/api/admin/sync-typesense' })
    const message = e instanceof Error ? e.message : 'Sync failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
