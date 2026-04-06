/**
 * One-time backfill: computes totalPointsEarned and totalPointsRedeemed from
 * each user's pointTransactions subcollection and writes the counters to the
 * user doc. Required before deploying the counter-based getBalance() code.
 *
 * Usage:
 *   npx tsx scripts/backfill-points-counters.ts              # normal run
 *   npx tsx scripts/backfill-points-counters.ts --dry-run    # logs without writing
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

const COLLECTIONS = { USERS: 'users' } as const
const SUBCOLLECTIONS = { POINT_TRANSACTIONS: 'pointTransactions' } as const

async function backfill(): Promise<void> {
  console.log(`Loading users...${DRY_RUN ? ' (DRY RUN)' : ''}`)
  const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS))
  console.log(`Found ${usersSnap.docs.length} users`)

  let processed = 0
  let skipped = 0
  let batch = writeBatch(db)
  let batchCount = 0
  const BATCH_LIMIT = 500

  for (const userDoc of usersSnap.docs) {
    const txSnap = await getDocs(
      collection(db, COLLECTIONS.USERS, userDoc.id, SUBCOLLECTIONS.POINT_TRANSACTIONS),
    )

    if (txSnap.empty) {
      skipped++
      continue
    }

    let totalEarned = 0
    let totalRedeemed = 0

    for (const txDoc of txSnap.docs) {
      const pts = txDoc.data().points as number
      if (pts > 0) {
        totalEarned += pts
      } else {
        totalRedeemed += Math.abs(pts)
      }
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY RUN] ${userDoc.id}: totalPointsEarned=${totalEarned}, totalPointsRedeemed=${totalRedeemed} (${txSnap.size} txns)`,
      )
    } else {
      batch.update(doc(db, COLLECTIONS.USERS, userDoc.id), {
        totalPointsEarned: totalEarned,
        totalPointsRedeemed: totalRedeemed,
      })
      batchCount++
    }
    processed++

    if (!DRY_RUN && batchCount >= BATCH_LIMIT) {
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

  console.log(
    `\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. ${DRY_RUN ? 'Would update' : 'Updated'}: ${processed}, Skipped (no transactions): ${skipped}`,
  )
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
