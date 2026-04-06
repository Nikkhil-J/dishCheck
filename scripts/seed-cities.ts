/**
 * Seed script: fetches restaurants from OpenStreetMap Overpass API
 * and seeds Firestore with restaurants + dishes for supported cities.
 *
 * Usage:
 *   npm run seed                          # normal run
 *   npx tsx scripts/seed-cities.ts --dry-run   # logs what would be written
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  DISHES: 'dishes',
} as const

const CUISINE_DISHES: Record<string, { name: string; category: string; dietary: string }[]> = {
  'North Indian': [
    { name: 'Butter Chicken', category: 'Main Course', dietary: 'non-veg' },
    { name: 'Dal Makhani', category: 'Main Course', dietary: 'veg' },
    { name: 'Paneer Tikka', category: 'Starter', dietary: 'veg' },
    { name: 'Chole Bhature', category: 'Breakfast', dietary: 'veg' },
    { name: 'Rajma Chawal', category: 'Main Course', dietary: 'veg' },
  ],
  'South Indian': [
    { name: 'Masala Dosa', category: 'Breakfast', dietary: 'veg' },
    { name: 'Idli Sambar', category: 'Breakfast', dietary: 'veg' },
    { name: 'Vada', category: 'Snack', dietary: 'veg' },
    { name: 'Uttapam', category: 'Breakfast', dietary: 'veg' },
    { name: 'Pongal', category: 'Breakfast', dietary: 'veg' },
  ],
  Chinese: [
    { name: 'Hakka Noodles', category: 'Main Course', dietary: 'veg' },
    { name: 'Fried Rice', category: 'Rice & Biryani', dietary: 'veg' },
    { name: 'Manchurian', category: 'Starter', dietary: 'veg' },
    { name: 'Spring Rolls', category: 'Starter', dietary: 'veg' },
    { name: 'Chilli Paneer', category: 'Starter', dietary: 'veg' },
  ],
  'Fast Food': [
    { name: 'Burger', category: 'Snack', dietary: 'non-veg' },
    { name: 'French Fries', category: 'Side Dish', dietary: 'veg' },
    { name: 'Sandwich', category: 'Snack', dietary: 'veg' },
    { name: 'Wrap', category: 'Snack', dietary: 'veg' },
    { name: 'Pizza Slice', category: 'Snack', dietary: 'veg' },
  ],
  Biryani: [
    { name: 'Chicken Biryani', category: 'Rice & Biryani', dietary: 'non-veg' },
    { name: 'Mutton Biryani', category: 'Rice & Biryani', dietary: 'non-veg' },
    { name: 'Veg Biryani', category: 'Rice & Biryani', dietary: 'veg' },
    { name: 'Egg Biryani', category: 'Rice & Biryani', dietary: 'egg' },
    { name: 'Hyderabadi Biryani', category: 'Rice & Biryani', dietary: 'non-veg' },
  ],
  default: [
    { name: 'Special Thali', category: 'Main Course', dietary: 'veg' },
    { name: 'Chef Special', category: 'Main Course', dietary: 'veg' },
    { name: 'House Favourite', category: 'Main Course', dietary: 'veg' },
    { name: 'Signature Dish', category: 'Main Course', dietary: 'veg' },
  ],
}

interface OSMNode {
  id: number
  lat: number
  lon: number
  tags?: {
    name?: string
    cuisine?: string
    'addr:suburb'?: string
    'addr:city'?: string
  }
}

async function fetchRestaurantsFromOSM(cityName: string): Promise<OSMNode[]> {
  const query = `[out:json];area["name"="${cityName}"];node["amenity"="restaurant"](area);out 50;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

  console.log(`  Fetching from Overpass API for ${cityName}...`)
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`  Overpass API returned ${res.status} for ${cityName}, using fallback data`)
    return []
  }
  const data = await res.json()
  return (data.elements ?? []) as OSMNode[]
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeCuisines(raw?: string): string[] {
  if (!raw) return ['North Indian']
  const lower = raw.toLowerCase()
  const cuisines: string[] = []
  if (lower.includes('south_indian') || lower.includes('south indian')) cuisines.push('South Indian')
  if (lower.includes('north_indian') || lower.includes('north indian')) cuisines.push('North Indian')
  if (lower.includes('chinese')) cuisines.push('Chinese')
  if (lower.includes('biryani')) cuisines.push('Biryani')
  if (lower.includes('burger') || lower.includes('fast')) cuisines.push('Fast Food')
  if (cuisines.length === 0) cuisines.push('North Indian')
  return cuisines
}

function getDefaultArea(city: string): string {
  if (city === 'Bengaluru') return 'Koramangala'
  if (city === 'Gurugram') return 'Cyber City'
  return city
}

function getFallbackRestaurants(city: string): OSMNode[] {
  const areas = city === 'Bengaluru'
    ? ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar']
    : ['Cyber City', 'Sector 29', 'Golf Course Road', 'DLF Phase 1', 'Sohna Road']

  const cuisines = ['North Indian', 'South Indian', 'Chinese', 'Biryani', 'Fast Food']

  return areas.flatMap((area, aIdx) =>
    cuisines.map((cuisine, cIdx) => ({
      id: aIdx * 100 + cIdx + 1,
      lat: 0,
      lon: 0,
      tags: {
        name: `${cuisine} House - ${area}`,
        cuisine: cuisine.toLowerCase().replace(' ', '_'),
        'addr:suburb': area,
      },
    }))
  )
}

async function seedCity(cityName: string) {
  console.log(`\nSeeding ${cityName}...`)

  const nodes = await fetchRestaurantsFromOSM(cityName)
  console.log(`  Found ${nodes.length} restaurants from OSM`)

  const validNodes = nodes.filter((n) => n.tags?.name)
  const toSeed = validNodes.length > 0 ? validNodes : getFallbackRestaurants(cityName)

  for (const node of toSeed.slice(0, 50)) {
    const name = node.tags?.name ?? 'Unknown Restaurant'
    const cuisines = normalizeCuisines(node.tags?.cuisine)
    const area = node.tags?.['addr:suburb'] ?? getDefaultArea(cityName)
    const restaurantId = `${slugify(cityName)}-${node.id}`
    const now = Timestamp.now()

    const restaurantData = {
      name,
      city: cityName,
      area,
      address: `${area}, ${cityName}`,
      cuisines,
      googlePlaceId: null,
      coordinates: { lat: node.lat ?? 0, lng: node.lon ?? 0 },
      coverImage: null,
      isActive: true,
      createdAt: now,
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Restaurant: ${restaurantId}`, JSON.stringify(restaurantData, null, 2))
    } else {
      const restaurantRef = doc(collection(db, COLLECTIONS.RESTAURANTS), restaurantId)
      await setDoc(restaurantRef, restaurantData, { merge: true })
    }

    const primaryCuisine = cuisines[0]
    const dishList = CUISINE_DISHES[primaryCuisine] ?? CUISINE_DISHES['default']

    for (const dishTemplate of dishList) {
      const dishId = `${restaurantId}-${slugify(dishTemplate.name)}`

      const dishData = {
        restaurantId,
        restaurantName: name,
        cuisines,
        area,
        name: dishTemplate.name,
        nameLower: dishTemplate.name.toLowerCase(),
        description: null,
        category: dishTemplate.category,
        dietary: dishTemplate.dietary,
        priceRange: null,
        coverImage: null,
        avgTaste: 0,
        avgPortion: 0,
        avgValue: 0,
        avgOverall: 0,
        reviewCount: 0,
        topTags: [],
        isActive: true,
        createdAt: now,
      }

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Dish: ${dishId}`, JSON.stringify(dishData, null, 2))
      } else {
        const dishRef = doc(collection(db, COLLECTIONS.DISHES), dishId)
        await setDoc(dishRef, dishData, { merge: true })
      }
    }

    if (!DRY_RUN) process.stdout.write('.')
  }

  console.log(`\n  ${DRY_RUN ? '[DRY RUN] Would seed' : '✓ Seeded'} ${toSeed.slice(0, 50).length} restaurants for ${cityName}`)
}

async function main() {
  console.log(`DishCheck seed script starting...${DRY_RUN ? ' (DRY RUN)' : ''}`)
  await seedCity('Bengaluru')
  await seedCity('Gurugram')
  console.log(`\n✅ ${DRY_RUN ? 'Dry run' : 'Seeding'} complete!`)
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
