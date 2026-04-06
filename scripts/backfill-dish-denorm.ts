/**
 * One-time backfill: copies `cuisines` and `area` from each dish's restaurant
 * onto the dish document. Required for cuisine/area filtering in searchDishes.
 *
 * Handles legacy data where restaurants may have `cuisine` (string) instead of
 * `cuisines` (string[]) and normalises it.
 *
 * Usage:
 *   npx tsx scripts/backfill-dish-denorm.ts              # normal run
 *   npx tsx scripts/backfill-dish-denorm.ts --dry-run    # logs without writing
 *
 * Requires NEXT_PUBLIC_FIREBASE_* env vars (loads from .env.local).
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore'

const DRY_RUN = process.argv.includes('--dry-run')

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  DISHES: 'dishes',
} as const

const FIRESTORE_BATCH_LIMIT = 500

function extractCuisines(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.cuisines) && data.cuisines.length > 0) {
    return data.cuisines as string[]
  }
  if (typeof data.cuisine === 'string' && data.cuisine.length > 0) {
    return [data.cuisine]
  }
  return []
}

async function backfill(): Promise<void> {
  console.log(`Loading restaurants...${DRY_RUN ? ' (DRY RUN)' : ''}`)
  const restSnap = await getDocs(collection(db, COLLECTIONS.RESTAURANTS))

  const restMap = new Map<string, { cuisines: string[]; area: string }>()
  for (const d of restSnap.docs) {
    const data = d.data() as Record<string, unknown>
    restMap.set(d.id, {
      cuisines: extractCuisines(data),
      area:     (data.area as string | undefined) ?? '',
    })
  }
  console.log(`Loaded ${restMap.size} restaurants`)

  console.log('Loading dishes...')
  const dishSnap = await getDocs(collection(db, COLLECTIONS.DISHES))
  console.log(`Found ${dishSnap.docs.length} dishes to backfill`)

  let updated = 0
  let skipped = 0
  let batch = writeBatch(db)
  let batchCount = 0

  for (const dishDoc of dishSnap.docs) {
    const data = dishDoc.data()
    const restaurantId = data.restaurantId as string

    const rest = restMap.get(restaurantId)
    if (!rest) {
      console.warn(`  SKIP ${dishDoc.id} — restaurant ${restaurantId} not found`)
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update ${dishDoc.id}: cuisines=${JSON.stringify(rest.cuisines)}, area=${rest.area}`)
    } else {
      batch.update(doc(db, COLLECTIONS.DISHES, dishDoc.id), {
        cuisines: rest.cuisines,
        area:     rest.area,
      })
      batchCount++
    }
    updated++

    if (!DRY_RUN && batchCount >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit()
      console.log(`  Committed batch of ${batchCount}`)
      batch = writeBatch(db)
      batchCount = 0
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit()
    console.log(`  Committed final batch of ${batchCount}`)
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. ${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}, Skipped: ${skipped}`)
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
