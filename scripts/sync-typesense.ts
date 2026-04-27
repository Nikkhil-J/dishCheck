/**
 * Syncs all Firestore dishes AND restaurants to Typesense for full-text search.
 *
 * Usage:
 *   npx tsx scripts/sync-typesense.ts
 *   npx tsx scripts/sync-typesense.ts --dry-run
 *
 * Requires TYPESENSE_HOST, TYPESENSE_API_KEY, and Firebase env vars in .env.local.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { Client } from 'typesense'
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'
import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const dryRun = process.argv.includes('--dry-run')

function getAdminApp() {
  if (getApps().length > 0) return getApp()

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const credential =
    projectId && clientEmail && privateKey
      ? cert({ projectId, clientEmail, privateKey })
      : applicationDefault()

  return initializeApp({ credential })
}

const adminDb = getFirestore(getAdminApp())

const DISHES_SCHEMA: CollectionCreateSchema = {
  name: 'dishes',
  fields: [
    { name: 'name', type: 'string' as const },
    { name: 'nameLower', type: 'string' as const },
    { name: 'restaurantId', type: 'string' as const, facet: true },
    { name: 'restaurantName', type: 'string' as const },
    { name: 'city', type: 'string' as const, facet: true },
    { name: 'area', type: 'string' as const, facet: true },
    { name: 'cuisines', type: 'string[]' as const, facet: true },
    { name: 'description', type: 'string' as const, optional: true },
    { name: 'category', type: 'string' as const, facet: true },
    { name: 'dietary', type: 'string' as const, facet: true },
    { name: 'priceRange', type: 'string' as const, facet: true, optional: true },
    { name: 'coverImage', type: 'string' as const, optional: true },
    { name: 'avgTaste', type: 'float' as const },
    { name: 'avgPortion', type: 'float' as const },
    { name: 'avgValue', type: 'float' as const },
    { name: 'avgOverall', type: 'float' as const },
    { name: 'reviewCount', type: 'int32' as const },
    { name: 'topTags', type: 'string[]' as const, facet: true },
    { name: 'isActive', type: 'bool' as const, facet: true },
    { name: 'createdAt', type: 'int64' as const },
  ],
  default_sorting_field: 'avgOverall',
}

const RESTAURANTS_SCHEMA: CollectionCreateSchema = {
  name: 'restaurants',
  fields: [
    { name: 'name', type: 'string' as const },
    { name: 'nameLower', type: 'string' as const },
    { name: 'city', type: 'string' as const, facet: true },
    { name: 'area', type: 'string' as const, facet: true },
    { name: 'cuisines', type: 'string[]' as const, facet: true },
    { name: 'coverImage', type: 'string' as const, optional: true },
    { name: 'dishNames', type: 'string[]' as const },
    { name: 'dishCount', type: 'int32' as const },
    { name: 'totalReviews', type: 'int32' as const },
    { name: 'isActive', type: 'bool' as const, facet: true },
    { name: 'createdAt', type: 'int64' as const },
  ],
  default_sorting_field: 'totalReviews',
}

interface RestaurantDoc {
  name?: string
  city?: string
  area?: string
  cuisines?: string[]
  coverImage?: string | null
  isActive?: boolean
  createdAt?: { toDate?: () => Date } | string | null
}

interface DishDoc {
  name?: string
  nameLower?: string
  restaurantId?: string
  restaurantName?: string
  city?: string
  area?: string
  cuisines?: string[]
  description?: string | null
  category?: string
  dietary?: string
  priceRange?: string | null
  coverImage?: string | null
  avgTaste?: number
  avgPortion?: number
  avgValue?: number
  avgOverall?: number
  reviewCount?: number
  topTags?: string[]
  isActive?: boolean
  createdAt?: { toDate?: () => Date } | string | null
}

function toEpoch(value: DishDoc['createdAt']): number {
  if (!value) return 0
  if (typeof value === 'string') return Math.floor(new Date(value).getTime() / 1000)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000)
  }
  return 0
}

function dishToTypesense(id: string, d: DishDoc) {
  return {
    id,
    name: d.name ?? '',
    nameLower: d.nameLower ?? (d.name ?? '').toLowerCase(),
    restaurantId: d.restaurantId ?? '',
    restaurantName: d.restaurantName ?? '',
    city: d.city ?? '',
    area: d.area ?? '',
    cuisines: d.cuisines ?? [],
    description: d.description ?? '',
    category: d.category ?? '',
    dietary: d.dietary ?? 'veg',
    priceRange: d.priceRange ?? '',
    coverImage: d.coverImage ?? '',
    avgTaste: d.avgTaste ?? 0,
    avgPortion: d.avgPortion ?? 0,
    avgValue: d.avgValue ?? 0,
    avgOverall: d.avgOverall ?? 0,
    reviewCount: d.reviewCount ?? 0,
    topTags: d.topTags ?? [],
    isActive: d.isActive ?? true,
    createdAt: toEpoch(d.createdAt),
  }
}

function restaurantToTypesense(
  id: string,
  r: RestaurantDoc,
  dishNames: string[],
  dishCount: number,
  totalReviews: number,
) {
  return {
    id,
    name: r.name ?? '',
    nameLower: (r.name ?? '').toLowerCase(),
    city: r.city ?? '',
    area: r.area ?? '',
    cuisines: r.cuisines ?? [],
    coverImage: r.coverImage ?? '',
    dishNames,
    dishCount,
    totalReviews,
    isActive: r.isActive ?? true,
    createdAt: toEpoch(r.createdAt),
  }
}

async function syncRestaurants(client: Client) {
  console.log('\n--- Restaurants ---')

  const restSnap = await adminDb.collection('restaurants').get()
  console.log(`  Found ${restSnap.size} restaurants in Firestore`)

  if (dryRun) {
    for (const doc of restSnap.docs) {
      const r = doc.data() as RestaurantDoc
      console.log(`  [DRY RUN] Would sync restaurant: ${doc.id} — ${r.name}`)
    }
    console.log(`\n[DRY RUN] Would upsert ${restSnap.size} restaurants`)
    return
  }

  try {
    await client.collections('restaurants').delete()
    console.log('  Dropped existing restaurants collection')
  } catch {
    console.log('  No existing restaurants collection to drop')
  }

  await client.collections().create(RESTAURANTS_SCHEMA)
  console.log('  Created restaurants collection with schema')

  const documents = await Promise.all(
    restSnap.docs.map(async (doc) => {
      const r = doc.data() as RestaurantDoc
      const dishSnap = await adminDb
        .collection('dishes')
        .where('restaurantId', '==', doc.id)
        .where('isActive', '==', true)
        .get()

      const dishNames: string[] = []
      let totalReviews = 0
      for (const d of dishSnap.docs) {
        const data = d.data() as DishDoc
        if (data.name) dishNames.push(data.name)
        totalReviews += data.reviewCount ?? 0
      }

      return restaurantToTypesense(doc.id, r, dishNames, dishSnap.size, totalReviews)
    })
  )

  const results = await client
    .collections('restaurants')
    .documents()
    .import(documents, { action: 'upsert' })

  const failed = results.filter((r) => !r.success)
  console.log(`\n  Upserted: ${results.length - failed.length}`)
  if (failed.length > 0) {
    console.error(`  Failed: ${failed.length}`)
    for (const f of failed.slice(0, 5)) {
      console.error(`    ${JSON.stringify(f)}`)
    }
  }
}

async function main() {
  if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    console.error('Missing TYPESENSE_HOST or TYPESENSE_API_KEY in env')
    process.exit(1)
  }

  const client = new Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST,
        port: Number(process.env.TYPESENSE_PORT ?? '443'),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'https',
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10,
  })

  console.log(`Typesense sync — ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Host: ${process.env.TYPESENSE_HOST}`)

  const snap = await adminDb.collection('dishes').get()
  console.log(`  Found ${snap.size} dishes in Firestore`)

  if (dryRun) {
    for (const doc of snap.docs) {
      const d = doc.data() as DishDoc
      console.log(`  [DRY RUN] Would sync: ${doc.id} — ${d.name}`)
    }
    console.log(`\n[DRY RUN] Would upsert ${snap.size} dishes`)
    process.exit(0)
  }

  try {
    await client.collections('dishes').delete()
    console.log('  Dropped existing dishes collection')
  } catch {
    console.log('  No existing dishes collection to drop')
  }

  await client.collections().create(DISHES_SCHEMA)
  console.log('  Created dishes collection with schema')

  const documents = snap.docs.map((doc) =>
    dishToTypesense(doc.id, doc.data() as DishDoc),
  )

  const results = await client
    .collections('dishes')
    .documents()
    .import(documents, { action: 'upsert' })

  const failed = results.filter((r) => !r.success)
  console.log(`\n  Upserted: ${results.length - failed.length}`)
  if (failed.length > 0) {
    console.error(`  Failed: ${failed.length}`)
    for (const f of failed.slice(0, 5)) {
      console.error(`    ${JSON.stringify(f)}`)
    }
  }

  await syncRestaurants(client)

  console.log('\nDone!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
