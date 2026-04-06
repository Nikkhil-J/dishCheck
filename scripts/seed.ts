/**
 * Seed script — populates Firestore with sample restaurants, dishes, and a demo user.
 *
 * Usage:
 *   npx tsx scripts/seed.ts              # normal run
 *   npx tsx scripts/seed.ts --dry-run    # logs what would be written
 *
 * Requires NEXT_PUBLIC_FIREBASE_* env vars to be set (loads from .env.local).
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore'
import { COLLECTIONS } from '../src/lib/firebase/config'

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

const now = Timestamp.now()

const RESTAURANTS = [
  {
    id: 'rest-1',
    name: 'Meghana Foods',
    city: 'Bengaluru',
    area: 'Koramangala',
    address: '1st Cross, 1st Block, Koramangala, Bengaluru',
    cuisines: ['South Indian', 'Biryani'],
    googlePlaceId: null,
    coordinates: { lat: 12.936, lng: 77.622 },
    coverImage: null,
    isActive: true,
    createdAt: now,
  },
  {
    id: 'rest-2',
    name: 'Vidyarthi Bhavan',
    city: 'Bengaluru',
    area: 'Jayanagar',
    address: '32, Gandhi Bazaar Main Road, Basavanagudi, Bengaluru',
    cuisines: ['South Indian'],
    googlePlaceId: null,
    coordinates: { lat: 12.943, lng: 77.567 },
    coverImage: null,
    isActive: true,
    createdAt: now,
  },
  {
    id: 'rest-3',
    name: 'Truffles',
    city: 'Bengaluru',
    area: 'Koramangala',
    address: '23, 100 Feet Road, Koramangala 4th Block, Bengaluru',
    cuisines: ['American', 'Burgers'],
    googlePlaceId: null,
    coordinates: { lat: 12.934, lng: 77.614 },
    coverImage: null,
    isActive: true,
    createdAt: now,
  },
]

const DISHES = [
  {
    id: 'dish-1',
    restaurantId: 'rest-1',
    restaurantName: 'Meghana Foods',
    cuisines: ['South Indian', 'Biryani'],
    area: 'Koramangala',
    name: 'Chicken Biryani',
    nameLower: 'chicken biryani',
    description: 'Aromatic basmati rice cooked with tender chicken and spices.',
    category: 'Rice & Biryani' as const,
    dietary: 'non-veg' as const,
    priceRange: '200-400' as const,
    coverImage: null,
    avgTaste: 4.5,
    avgPortion: 4.0,
    avgValue: 4.2,
    avgOverall: 4.2,
    reviewCount: 3,
    topTags: ['Spicy', 'Generous portion', 'Authentic', 'Recommended', 'Great value'],
    isActive: true,
    createdAt: now,
  },
  {
    id: 'dish-2',
    restaurantId: 'rest-1',
    restaurantName: 'Meghana Foods',
    cuisines: ['South Indian', 'Biryani'],
    area: 'Koramangala',
    name: 'Mutton Biryani',
    nameLower: 'mutton biryani',
    description: 'Slow-cooked mutton with fragrant biryani rice.',
    category: 'Rice & Biryani' as const,
    dietary: 'non-veg' as const,
    priceRange: '200-400' as const,
    coverImage: null,
    avgTaste: 4.8,
    avgPortion: 4.3,
    avgValue: 4.0,
    avgOverall: 4.4,
    reviewCount: 2,
    topTags: ['Spicy', 'Authentic', 'Recommended'],
    isActive: true,
    createdAt: now,
  },
  {
    id: 'dish-3',
    restaurantId: 'rest-2',
    restaurantName: 'Vidyarthi Bhavan',
    cuisines: ['South Indian'],
    area: 'Jayanagar',
    name: 'Masala Dosa',
    nameLower: 'masala dosa',
    description: 'Crispy dosa with spiced potato filling and fresh chutneys.',
    category: 'Breakfast' as const,
    dietary: 'veg' as const,
    priceRange: 'under-100' as const,
    coverImage: null,
    avgTaste: 4.9,
    avgPortion: 3.8,
    avgValue: 4.8,
    avgOverall: 4.5,
    reviewCount: 5,
    topTags: ['Authentic', 'Recommended', 'Great value', 'Comfort food', 'Mild'],
    isActive: true,
    createdAt: now,
  },
  {
    id: 'dish-4',
    restaurantId: 'rest-3',
    restaurantName: 'Truffles',
    cuisines: ['American', 'Burgers'],
    area: 'Koramangala',
    name: 'The Truffles Burger',
    nameLower: 'the truffles burger',
    description: 'Double-patty beef burger with caramelised onions and truffle sauce.',
    category: 'Snack' as const,
    dietary: 'non-veg' as const,
    priceRange: '200-400' as const,
    coverImage: null,
    avgTaste: 4.6,
    avgPortion: 4.7,
    avgValue: 3.9,
    avgOverall: 4.4,
    reviewCount: 4,
    topTags: ['Generous portion', 'Recommended', 'Savoury', 'Good for sharing', 'Fresh ingredients'],
    isActive: true,
    createdAt: now,
  },
  {
    id: 'dish-5',
    restaurantId: 'rest-2',
    restaurantName: 'Vidyarthi Bhavan',
    cuisines: ['South Indian'],
    area: 'Jayanagar',
    name: 'Idli Vada',
    nameLower: 'idli vada',
    description: 'Soft idlis served with crispy vada, sambar, and chutneys.',
    category: 'Breakfast' as const,
    dietary: 'veg' as const,
    priceRange: 'under-100' as const,
    coverImage: null,
    avgTaste: 4.7,
    avgPortion: 3.9,
    avgValue: 4.9,
    avgOverall: 4.5,
    reviewCount: 2,
    topTags: ['Authentic', 'Great value', 'Comfort food'],
    isActive: true,
    createdAt: now,
  },
]

async function seed() {
  console.log(`Seeding Firestore…${DRY_RUN ? ' (DRY RUN)' : ''}`)

  for (const r of RESTAURANTS) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Restaurant: ${r.id}`, JSON.stringify(r, null, 2))
    } else {
      await setDoc(doc(collection(db, COLLECTIONS.RESTAURANTS), r.id), r)
      console.log(`  ✓ Restaurant: ${r.name}`)
    }
  }

  for (const d of DISHES) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Dish: ${d.id}`, JSON.stringify(d, null, 2))
    } else {
      await setDoc(doc(collection(db, COLLECTIONS.DISHES), d.id), d)
      console.log(`  ✓ Dish: ${d.name}`)
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] Would seed' : 'Done! Seeded'}:`)
  console.log(`  ${RESTAURANTS.length} restaurants`)
  console.log(`  ${DISHES.length} dishes`)
  process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })
