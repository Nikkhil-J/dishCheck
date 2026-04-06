/**
 * Restaurant analytics aggregation service.
 *
 * Computes dish-level sentiment analytics for the restaurant owner dashboard.
 * Uses a two-tier cache (in-process Map + Firestore subcollection) with 1-hour TTL.
 */

import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { getAnalyticsCache, setAnalyticsCache } from './analytics-cache'

// ── Public types ─────────────────────────────────────────

export interface DishSentiment {
  dishId: string
  dishName: string
  category: string
  reviewCount: number
  avgTaste: number
  avgPortion: number
  avgValue: number
  avgOverall: number
  tagFrequency: Record<string, number>
  recentSnippets: ReviewSnippet[]
}

export interface ReviewSnippet {
  reviewId: string
  userName: string
  text: string
  avgOverall: number
  createdAt: string
}

export interface RestaurantAnalytics {
  restaurantId: string
  restaurantName: string
  totalReviews30d: number
  avgOverallRating: number
  topDishes: DishSummary[]
  bottomDishes: DishSummary[]
  dishes: DishSentiment[]
  computedAt: string
}

export interface DishSummary {
  dishId: string
  dishName: string
  avgOverall: number
  reviewCount: number
}

// ── Main entry point ─────────────────────────────────────

export async function getRestaurantAnalytics(restaurantId: string): Promise<RestaurantAnalytics | null> {
  const cached = await getAnalyticsCache(restaurantId)
  if (cached) return cached

  return computeAndCacheAnalytics(restaurantId)
}

// ── Compute aggregation ──────────────────────────────────

async function computeAndCacheAnalytics(restaurantId: string): Promise<RestaurantAnalytics | null> {
  const restaurantSnap = await adminDb.collection(COLLECTIONS.RESTAURANTS).doc(restaurantId).get()
  if (!restaurantSnap.exists) return null

  const restaurantName = (restaurantSnap.data()?.name as string) ?? ''

  const dishesSnap = await adminDb
    .collection(COLLECTIONS.DISHES)
    .where('restaurantId', '==', restaurantId)
    .where('isActive', '==', true)
    .get()

  if (dishesSnap.empty) {
    const empty: RestaurantAnalytics = {
      restaurantId,
      restaurantName,
      totalReviews30d: 0,
      avgOverallRating: 0,
      topDishes: [],
      bottomDishes: [],
      dishes: [],
      computedAt: new Date().toISOString(),
    }
    await setAnalyticsCache(restaurantId, empty)
    return empty
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { Timestamp } = await import('firebase-admin/firestore')
  const thirtyDaysTimestamp = Timestamp.fromDate(thirtyDaysAgo)

  const allReviewsSnap = await adminDb
    .collection(COLLECTIONS.REVIEWS)
    .where('restaurantId', '==', restaurantId)
    .where('isApproved', '==', true)
    .get()

  const recentReviewsSnap = await adminDb
    .collection(COLLECTIONS.REVIEWS)
    .where('restaurantId', '==', restaurantId)
    .where('isApproved', '==', true)
    .where('createdAt', '>=', thirtyDaysTimestamp)
    .get()

  const totalReviews30d = recentReviewsSnap.size

  const reviewsByDish = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>()
  for (const doc of allReviewsSnap.docs) {
    const dishId = doc.data().dishId as string
    const existing = reviewsByDish.get(dishId) ?? []
    existing.push(doc)
    reviewsByDish.set(dishId, existing)
  }

  const dishes: DishSentiment[] = []

  for (const dishDoc of dishesSnap.docs) {
    const dishData = dishDoc.data()
    const dishReviews = reviewsByDish.get(dishDoc.id) ?? []

    const tagFrequency: Record<string, number> = {}
    let sumTaste = 0, sumPortion = 0, sumValue = 0

    const snippets: ReviewSnippet[] = []

    for (const rev of dishReviews) {
      const rd = rev.data()
      sumTaste += rd.tasteRating as number
      sumPortion += rd.portionRating as number
      sumValue += rd.valueRating as number

      const tags = (rd.tags as string[]) ?? []
      for (const tag of tags) {
        tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1
      }

      const text = rd.text as string | null
      if (text && snippets.length < 3) {
        const overall = Math.round(
          (((rd.tasteRating as number) + (rd.portionRating as number) + (rd.valueRating as number)) / 3) * 10
        ) / 10

        snippets.push({
          reviewId: rev.id,
          userName: (rd.userName as string) ?? 'Anonymous',
          text,
          avgOverall: overall,
          createdAt: rd.createdAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString(),
        })
      }
    }

    const count = dishReviews.length

    dishes.push({
      dishId: dishDoc.id,
      dishName: (dishData.name as string) ?? '',
      category: (dishData.category as string) ?? '',
      reviewCount: count,
      avgTaste: count > 0 ? Math.round((sumTaste / count) * 10) / 10 : 0,
      avgPortion: count > 0 ? Math.round((sumPortion / count) * 10) / 10 : 0,
      avgValue: count > 0 ? Math.round((sumValue / count) * 10) / 10 : 0,
      avgOverall: count > 0
        ? Math.round(((sumTaste + sumPortion + sumValue) / (count * 3)) * 10) / 10
        : 0,
      tagFrequency,
      recentSnippets: snippets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    })
  }

  const reviewedDishes = dishes.filter((d) => d.reviewCount > 0)
  const sorted = [...reviewedDishes].sort((a, b) => b.avgOverall - a.avgOverall)

  const totalRatings = reviewedDishes.reduce((acc, d) => acc + d.avgOverall * d.reviewCount, 0)
  const totalReviewCount = reviewedDishes.reduce((acc, d) => acc + d.reviewCount, 0)
  const avgOverallRating = totalReviewCount > 0
    ? Math.round((totalRatings / totalReviewCount) * 10) / 10
    : 0

  const analytics: RestaurantAnalytics = {
    restaurantId,
    restaurantName,
    totalReviews30d,
    avgOverallRating,
    topDishes: sorted.slice(0, 3).map(toSummary),
    bottomDishes: sorted.length > 3
      ? sorted.slice(-3).reverse().map(toSummary)
      : [],
    dishes,
    computedAt: new Date().toISOString(),
  }

  await setAnalyticsCache(restaurantId, analytics)
  return analytics
}

function toSummary(d: DishSentiment): DishSummary {
  return {
    dishId: d.dishId,
    dishName: d.dishName,
    avgOverall: d.avgOverall,
    reviewCount: d.reviewCount,
  }
}
