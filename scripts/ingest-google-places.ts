/**
 * Google Maps Places ingestion script — replaces OpenStreetMap seed-cities.ts.
 *
 * Fetches restaurants from Google Maps Places API (New) and upserts them
 * into Firestore with properly-typed schema.
 *
 * Usage:
 *   npx tsx scripts/ingest-google-places.ts --city=Bengaluru
 *   npx tsx scripts/ingest-google-places.ts --city=Bengaluru --cuisine="North Indian"
 *   npx tsx scripts/ingest-google-places.ts --city=Bengaluru --limit=50 --dry-run
 *
 * Requires:
 *   GOOGLE_PLACES_API_KEY in .env.local
 *   NEXT_PUBLIC_FIREBASE_* env vars in .env.local
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { searchPlacesAll, type PlaceSearchResult } from '../src/lib/services/google-places'

// ── CLI arg parsing ──────────────────────────────────────

function parseArgs(): { city: string; cuisine: string | undefined; limit: number; dryRun: boolean } {
  const args = process.argv.slice(2)
  let city = ''
  let cuisine: string | undefined
  let limit = 100
  let dryRun = false

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg.startsWith('--city=')) {
      city = arg.replace('--city=', '')
    } else if (arg.startsWith('--cuisine=')) {
      cuisine = arg.replace('--cuisine=', '').replace(/"/g, '')
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.replace('--limit=', ''), 10)
      if (isNaN(limit) || limit < 1) {
        console.error('Error: --limit must be a positive integer')
        process.exit(1)
      }
    }
  }

  if (!city) {
    console.error('Error: --city flag is required')
    console.error('Usage: npx tsx scripts/ingest-google-places.ts --city=Bengaluru [--cuisine="North Indian"] [--limit=100] [--dry-run]')
    process.exit(1)
  }

  return { city, cuisine, limit, dryRun }
}

// ── Firebase setup ───────────────────────────────────────

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
} as const

// ── Duplicate detection ──────────────────────────────────

async function getExistingPlaceIds(): Promise<Set<string>> {
  const ref = collection(db, COLLECTIONS.RESTAURANTS)
  const snap = await getDocs(
    query(ref, where('googlePlaceId', '!=', null))
  )
  const ids = new Set<string>()
  for (const docSnap of snap.docs) {
    const placeId = docSnap.data().googlePlaceId
    if (typeof placeId === 'string') {
      ids.add(placeId)
    }
  }
  return ids
}

// ── Build Firestore document ─────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildRestaurantDoc(place: PlaceSearchResult, now: ReturnType<typeof Timestamp.now>) {
  return {
    name: place.name,
    city: place.city,
    area: place.area,
    address: place.address,
    cuisines: place.cuisines,
    googlePlaceId: place.googlePlaceId,
    coordinates: place.coordinates,
    coverImage: null,
    phoneNumber: place.phoneNumber,
    website: place.website,
    googleMapsUrl: place.googleMapsUrl,
    googleRating: place.googleRating,
    isVerified: false,
    isActive: true,
    createdAt: now,
  }
}

function generateDocId(place: PlaceSearchResult): string {
  return `gp-${slugify(place.city)}-${slugify(place.name)}-${place.googlePlaceId.slice(-8)}`
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const { city, cuisine, limit, dryRun } = parseArgs()

  console.log(`\nDishCheck — Google Places Ingestion`)
  console.log(`  City:    ${city}`)
  console.log(`  Cuisine: ${cuisine ?? '(all)'}`)
  console.log(`  Limit:   ${limit}`)
  console.log(`  Mode:    ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('')

  let existingPlaceIds = new Set<string>()
  if (!dryRun) {
    console.log('Loading existing restaurant googlePlaceIds for dedup...')
    existingPlaceIds = await getExistingPlaceIds()
    console.log(`  Found ${existingPlaceIds.size} existing restaurants with googlePlaceId\n`)
  }

  let created = 0
  let updated = 0
  const skipped = 0
  const now = Timestamp.now()

  const searchOptions = { city, cuisine, limit }

  for await (const page of searchPlacesAll(searchOptions)) {
    for (const place of page) {
      const docId = generateDocId(place)
      const isExisting = existingPlaceIds.has(place.googlePlaceId)
      const restaurantDoc = buildRestaurantDoc(place, now)

      if (dryRun) {
        const action = isExisting ? 'UPDATE' : 'CREATE'
        console.log(`  [DRY RUN] [${action}] ${docId}`)
        console.log(`    Name:     ${place.name}`)
        console.log(`    Area:     ${place.area}`)
        console.log(`    Cuisines: ${place.cuisines.join(', ')}`)
        console.log(`    PlaceId:  ${place.googlePlaceId}`)
        console.log(`    Rating:   ${place.googleRating ?? 'N/A'}`)
        console.log('')

        if (isExisting) {
          updated++
        } else {
          created++
        }
        continue
      }

      const docRef = doc(collection(db, COLLECTIONS.RESTAURANTS), docId)

      if (isExisting) {
        // Upsert: merge to preserve any manually-set fields
        await setDoc(docRef, restaurantDoc, { merge: true })
        updated++
        process.stdout.write('U')
      } else {
        await setDoc(docRef, restaurantDoc)
        existingPlaceIds.add(place.googlePlaceId)
        created++
        process.stdout.write('.')
      }

      await delay(200)
    }
  }

  console.log(`\n\n${dryRun ? '[DRY RUN] Would have:' : 'Done!'}`)
  console.log(`  Created:  ${created} restaurants`)
  console.log(`  Updated:  ${updated} restaurants`)
  console.log(`  Skipped:  ${skipped} restaurants`)
  console.log(`  Total:    ${created + updated + skipped}`)

  process.exit(0)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  console.error('\nIngestion failed:', err)
  process.exit(1)
})
