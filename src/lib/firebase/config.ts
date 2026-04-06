import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { env } from '@/lib/env'

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  DISHES: 'dishes',
  REVIEWS: 'reviews',
  USERS: 'users',
  DISH_REQUESTS: 'dishRequests',
  NOTIFICATIONS: 'notifications',
  COUPONS: 'coupons',
  RESTAURANT_CLAIMS: 'restaurantClaims',
  BILLING_EVENTS: 'billingEvents',
} as const

export const SUBCOLLECTIONS = {
  WISHLIST: 'wishlist',
  POINT_TRANSACTIONS: 'pointTransactions',
  COUPON_CLAIMS: 'couponClaims',
} as const
