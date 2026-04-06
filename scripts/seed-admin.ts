/**
 * Admin seed script — bypasses Firestore security rules using Firebase Admin SDK.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 */

import * as dotenv from 'dotenv'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

dotenv.config({ path: '.env.local' })

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function initAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: required('FIREBASE_PROJECT_ID'),
        clientEmail: required('FIREBASE_CLIENT_EMAIL'),
        privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

const db = initAdminDb()
const now = Timestamp.now()

const restaurants = [
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

const dishes = [
  {
    id: 'dish-1',
    restaurantId: 'rest-1',
    restaurantName: 'Meghana Foods',
    cuisines: ['South Indian', 'Biryani'],
    area: 'Koramangala',
    name: 'Chicken Biryani',
    nameLower: 'chicken biryani',
    description: 'Aromatic basmati rice cooked with tender chicken and spices.',
    category: 'Rice & Biryani',
    dietary: 'non-veg',
    priceRange: '200-400',
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
    restaurantId: 'rest-2',
    restaurantName: 'Vidyarthi Bhavan',
    cuisines: ['South Indian'],
    area: 'Jayanagar',
    name: 'Masala Dosa',
    nameLower: 'masala dosa',
    description: 'Crispy dosa with spiced potato filling and fresh chutneys.',
    category: 'Breakfast',
    dietary: 'veg',
    priceRange: 'under-100',
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
    id: 'dish-3',
    restaurantId: 'rest-3',
    restaurantName: 'Truffles',
    cuisines: ['American', 'Burgers'],
    area: 'Koramangala',
    name: 'The Truffles Burger',
    nameLower: 'the truffles burger',
    description: 'Double-patty burger with caramelized onions and sauce.',
    category: 'Snack',
    dietary: 'non-veg',
    priceRange: '200-400',
    coverImage: null,
    avgTaste: 4.6,
    avgPortion: 4.7,
    avgValue: 3.9,
    avgOverall: 4.4,
    reviewCount: 4,
    topTags: ['Generous portion', 'Recommended', 'Savory', 'Good for sharing', 'Fresh ingredients'],
    isActive: true,
    createdAt: now,
  },
]

async function main() {
  console.log('Seeding via Firebase Admin SDK...')

  const batch = db.batch()

  for (const restaurant of restaurants) {
    batch.set(db.collection('restaurants').doc(restaurant.id), restaurant, { merge: true })
  }
  for (const dish of dishes) {
    batch.set(db.collection('dishes').doc(dish.id), dish, { merge: true })
  }

  await batch.commit()
  console.log(`Seeded ${restaurants.length} restaurants and ${dishes.length} dishes.`)
}

main().catch((error) => {
  console.error('Admin seed failed:', error)
  process.exit(1)
})

