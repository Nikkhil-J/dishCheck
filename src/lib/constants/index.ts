import type { UserLevel, DishCategory } from '../types'

// ── Review tags ───────────────────────────────────────────
export const TAG_LIST = [
  'Spicy',
  'Mild',
  'Very sweet',
  'Savoury',
  'Authentic',
  'Overcooked',
  'Undercooked',
  'Generous portion',
  'Small portion',
  'Good for sharing',
  'Solo serving',
  'Great value',
  'Fair price',
  'Overpriced',
  'Fresh ingredients',
  'Oily',
  'Dry',
  'Recommended',
  'Skip it',
  'Comfort food',
] as const

// ── Badge definitions ─────────────────────────────────────
export interface BadgeDefinition {
  id: string
  label: string
  description: string
  icon: string
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first-bite',     label: 'First Bite',     description: 'Wrote your first review',          icon: '🍽️' },
  { id: 'regular',        label: 'Regular',         description: 'Wrote 5 reviews',                  icon: '⭐' },
  { id: 'dish-explorer',  label: 'Dish Explorer',   description: 'Wrote 10 reviews',                 icon: '🧭' },
  { id: 'food-critic',    label: 'Food Critic',     description: 'Wrote 25 reviews',                 icon: '📝' },
  { id: 'legend',         label: 'Legend',          description: 'Wrote 50 reviews',                 icon: '👑' },
  { id: 'helpful',        label: 'Helpful',         description: 'Received 10 helpful votes',        icon: '👍' },
  { id: 'trusted',        label: 'Trusted',         description: 'Received 50 helpful votes',        icon: '🏅' },
]

// ── Level thresholds ──────────────────────────────────────
export const LEVEL_THRESHOLDS: Record<UserLevel, { min: number; max: number | null }> = {
  Newbie:  { min: 0,  max: 4  },
  Foodie:  { min: 5,  max: 19 },
  Critic:  { min: 20, max: 49 },
  Legend:  { min: 50, max: null },
}

/** Returns the UserLevel for a given review count. */
export function computeLevel(reviewCount: number): UserLevel {
  if (reviewCount >= 50) return 'Legend'
  if (reviewCount >= 20) return 'Critic'
  if (reviewCount >= 5)  return 'Foodie'
  return 'Newbie'
}

/** Returns array of earned badge IDs based on review count and helpful votes. */
export function computeEarnedBadges(reviewCount: number, helpfulVotes: number): string[] {
  const earned: string[] = []
  if (reviewCount >= 1)  earned.push('first-bite')
  if (reviewCount >= 5)  earned.push('regular')
  if (reviewCount >= 10) earned.push('dish-explorer')
  if (reviewCount >= 25) earned.push('food-critic')
  if (reviewCount >= 50) earned.push('legend')
  if (helpfulVotes >= 10) earned.push('helpful')
  if (helpfulVotes >= 50) earned.push('trusted')
  return earned
}

/** Returns BadgeDefinition[] of badges just earned by comparing before/after counts. */
export function getNewlyEarnedBadges(
  prevReviewCount: number,
  newReviewCount: number,
  prevHelpfulVotes: number,
  newHelpfulVotes: number,
): BadgeDefinition[] {
  const before = new Set(computeEarnedBadges(prevReviewCount, prevHelpfulVotes))
  const after  = computeEarnedBadges(newReviewCount, newHelpfulVotes)
  const newIds = after.filter((id) => !before.has(id))
  return BADGE_DEFINITIONS.filter((b) => newIds.includes(b.id))
}

// ── Cuisine types ─────────────────────────────────────────
export const CUISINE_TYPES = [
  'North Indian',
  'South Indian',
  'Bengali',
  'Punjabi',
  'Rajasthani',
  'Gujarati',
  'Maharashtrian',
  'Kerala',
  'Hyderabadi',
  'Mughlai',
  'Chettinad',
  'Kashmiri',
  'Goan',
  'Awadhi',
  'Sindhi',
  'Bihari',
  'Odia',
  'Street Food',
  'Fusion',
  'Pan-Indian',
] as const

// ── Bengaluru areas ───────────────────────────────────────
export const BENGALURU_AREAS = [
  'Indiranagar',
  'Koramangala',
  'HSR Layout',
  'Whitefield',
  'Jayanagar',
  'JP Nagar',
  'Marathahalli',
  'Electronic City',
  'Bannerghatta Road',
  'Yelahanka',
  'Hebbal',
  'Rajajinagar',
  'Malleshwaram',
  'Sadashivanagar',
  'MG Road',
  'Brigade Road',
  'Bellandur',
  'Sarjapur Road',
] as const

// ── Review constraints ────────────────────────────────────
export const REVIEW_EDIT_WINDOW_MS     = 86_400_000 // 24 hours
export const REVIEWS_PER_PAGE          = 10
export const DISHES_PER_PAGE           = 20
export const REVIEW_TEXT_MIN_CHARS     = 30
export const REVIEW_PHOTO_MAX_MB       = 5
export const REVIEW_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// ── Dish categories (re-exported for convenience) ─────────
export const DISH_CATEGORIES: DishCategory[] = [
  'Starter', 'Main Course', 'Bread', 'Rice & Biryani',
  'Dessert', 'Beverage', 'Side Dish', 'Snack',
  'Street Food', 'Breakfast',
]
