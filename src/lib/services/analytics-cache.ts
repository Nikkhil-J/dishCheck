import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import type { RestaurantAnalytics } from './restaurant-analytics'
import { logError } from '@/lib/logger'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const CACHE_DOC_ID = 'analytics'

interface AnalyticsCacheEntry {
  data: RestaurantAnalytics
  computedAt: string
  expiresAt: string
}

// ── Tier 1: In-process Map cache ────────────────────────

const memoryCache = new Map<string, AnalyticsCacheEntry>()

function isExpired(entry: AnalyticsCacheEntry): boolean {
  return Date.now() > new Date(entry.expiresAt).getTime()
}

// ── Tier 2: Firestore subcollection cache ───────────────

function cacheRef(restaurantId: string) {
  return adminDb
    .collection(COLLECTIONS.RESTAURANTS)
    .doc(restaurantId)
    .collection('cache')
    .doc(CACHE_DOC_ID)
}

export async function getAnalyticsCache(restaurantId: string): Promise<RestaurantAnalytics | null> {
  const memEntry = memoryCache.get(restaurantId)
  if (memEntry && !isExpired(memEntry)) {
    return memEntry.data
  }

  if (memEntry) {
    memoryCache.delete(restaurantId)
  }

  try {
    const snap = await cacheRef(restaurantId).get()
    if (!snap.exists) return null

    const raw = snap.data()
    if (!raw?.expiresAt) return null

    const expiresAtStr =
      typeof raw.expiresAt === 'string'
        ? raw.expiresAt
        : raw.expiresAt.toDate?.()?.toISOString?.() ?? ''

    if (Date.now() > new Date(expiresAtStr).getTime()) return null

    const entry: AnalyticsCacheEntry = {
      data: raw.data as RestaurantAnalytics,
      computedAt: typeof raw.computedAt === 'string'
        ? raw.computedAt
        : raw.computedAt?.toDate?.()?.toISOString?.() ?? '',
      expiresAt: expiresAtStr,
    }

    memoryCache.set(restaurantId, entry)
    return entry.data
  } catch (e) {
    logError('getAnalyticsCache', e)
    return null
  }
}

export async function setAnalyticsCache(
  restaurantId: string,
  data: RestaurantAnalytics,
): Promise<void> {
  const now = new Date()
  const entry: AnalyticsCacheEntry = {
    data,
    computedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
  }

  memoryCache.set(restaurantId, entry)

  try {
    await cacheRef(restaurantId).set(entry)
  } catch (e) {
    logError('setAnalyticsCache', e)
  }
}

export async function invalidateAnalyticsCache(restaurantId: string): Promise<void> {
  memoryCache.delete(restaurantId)

  try {
    await cacheRef(restaurantId).delete()
  } catch (e) {
    logError('invalidateAnalyticsCache', e)
  }
}
