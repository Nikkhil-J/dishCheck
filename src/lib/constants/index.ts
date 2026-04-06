import type { UserLevel, DishCategory, PriceRange, DietaryType, BadgeDefinition } from '../types'

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

// ── Cuisine types ─────────────────────────────────────────
export const CUISINE_TYPES = [
  // Indian
  'North Indian', 'South Indian', 'Bengali', 'Punjabi',
  'Rajasthani', 'Gujarati', 'Maharashtrian', 'Kerala',
  'Hyderabadi', 'Mughlai', 'Chettinad', 'Kashmiri',
  'Biryani', 'Street Food', 'Andhra', 'Karnataka',
  'Goan', 'Awadhi', 'Sindhi', 'Bihari', 'Odia',
  // International
  'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese',
  'Italian', 'Continental', 'American', 'Mexican',
  'Mediterranean', 'Middle Eastern', 'Lebanese',
  // Other
  'Cafe', 'Bakery', 'Desserts', 'Fast Food', 'Beverages',
  'Fusion', 'Pan-Indian',
] as const

// ── City areas (single source of truth) ──────────────────
export const SUPPORTED_CITIES = ['Bengaluru', 'Gurugram'] as const
export type City = (typeof SUPPORTED_CITIES)[number]

export const CITY_AREAS: Record<City, readonly string[]> = {
  Bengaluru: [
    'Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield',
    'Jayanagar', 'JP Nagar', 'Marathahalli', 'Electronic City',
    'Bannerghatta Road', 'Yelahanka', 'Hebbal', 'Rajajinagar',
    'Malleshwaram', 'Sadashivanagar', 'MG Road', 'Brigade Road',
    'Bellandur', 'Sarjapur Road',
  ],
  Gurugram: [
    'Sector 29', 'Cyber City', 'Golf Course Road', 'DLF Phase 1',
    'Sohna Road', 'MG Road', 'Udyog Vihar', 'Sector 14',
    'South City', 'Palam Vihar',
  ],
}

// ── Plan pricing (paise) ─────────────────────────────────
export const PLAN_PRICES = {
  monthly: 19900,
  yearly: 199900,
} as const

// ── Review constraints ────────────────────────────────────
export const REVIEW_EDIT_WINDOW_MS     = 86_400_000 // 24 hours
export const REVIEWS_PER_PAGE          = 10
export const DISHES_PER_PAGE           = 20
export const REVIEW_TEXT_MIN_CHARS     = 30
export const REVIEW_PHOTO_MAX_MB       = 5
export const REVIEW_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const FIRESTORE_BATCH_LIMIT     = 500

// ── Dish categories ──────────────────────────────────────
export const DISH_CATEGORIES: DishCategory[] = [
  'Starter', 'Main Course', 'Bread', 'Rice & Biryani',
  'Dessert', 'Beverage', 'Side Dish', 'Snack',
  'Street Food', 'Breakfast',
]

// ── Display constants ────────────────────────────────────

export const PRICE_LABEL: Record<PriceRange, string> = {
  'under-100': '< ₹100',
  '100-200': '₹100–200',
  '200-400': '₹200–400',
  '400-600': '₹400–600',
  'above-600': '> ₹600',
}

export const DIETARY_BADGE: Record<DietaryType, { label: string; className: string }> = {
  veg: { label: '🟢 Vegetarian', className: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30' },
  'non-veg': { label: '🔴 Non-vegetarian', className: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/30' },
  egg: { label: '🟡 Contains egg', className: 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]/30' },
}

export const DIETARY_ICON: Record<DietaryType, string> = {
  veg: '🟢 Veg',
  'non-veg': '🔴 Non-veg',
  egg: '🟡 Egg',
}

export const LEVEL_COLORS: Record<UserLevel, string> = {
  Newbie: 'bg-border text-text-secondary',
  Foodie: 'bg-primary-light text-primary-dark',
  Critic: 'bg-accent-light text-[var(--color-accent)]',
  Legend: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export const CUISINE_EMOJI: Record<string, string> = {
  'North Indian': '🍛',
  'South Indian': '🫓',
  Bengali: '🐟',
  Punjabi: '🧈',
  Rajasthani: '🏜️',
  Gujarati: '🥘',
  Maharashtrian: '🍲',
  Kerala: '🥥',
  Hyderabadi: '🍗',
  Mughlai: '🥘',
  Chettinad: '🌶️',
  Kashmiri: '🍖',
  Biryani: '🍚',
  'Street Food': '🌯',
  Andhra: '🌶️',
  Karnataka: '🫓',
  Goan: '🦐',
  Awadhi: '🍢',
  Sindhi: '🫕',
  Bihari: '🍚',
  Odia: '🥣',
  Chinese: '🥡',
  Japanese: '🍣',
  Korean: '🥘',
  Thai: '🍜',
  Vietnamese: '🍲',
  Italian: '🍕',
  Continental: '🍽️',
  American: '🍔',
  Mexican: '🌮',
  Mediterranean: '🫒',
  'Middle Eastern': '🧆',
  Lebanese: '🥙',
  Cafe: '☕',
  Bakery: '🥐',
  Desserts: '🍰',
  'Fast Food': '🍟',
  Beverages: '🥤',
  Fusion: '🍱',
  'Pan-Indian': '🇮🇳',
}
