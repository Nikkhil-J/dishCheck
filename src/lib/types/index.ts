// ── Enums ────────────────────────────────────────────────
export type UserLevel = 'Newbie' | 'Foodie' | 'Critic' | 'Legend'

export type BadgeId =
  | 'first-bite' | 'regular' | 'dish-explorer'
  | 'food-critic' | 'legend' | 'helpful' | 'trusted'

export type DishCategory =
  | 'Starter' | 'Main Course' | 'Bread' | 'Rice & Biryani'
  | 'Dessert' | 'Beverage' | 'Side Dish' | 'Snack'
  | 'Street Food' | 'Breakfast'

export type DishRequestStatus = 'pending' | 'approved' | 'rejected'

export type RestaurantClaimStatus = 'pending' | 'approved' | 'rejected'
export type ClaimantRole = 'owner' | 'manager'

export type PriceRange =
  | 'under-100' | '100-200' | '200-400' | '400-600' | 'above-600'

export type DietaryType = 'veg' | 'non-veg' | 'egg'

export type SortOrder = 'newest' | 'highest-rated' | 'most-helpful'

// ── Core models ──────────────────────────────────────────
export interface Restaurant {
  id: string
  name: string
  city: string
  area: string
  address: string
  cuisines: string[]
  googlePlaceId: string | null
  coordinates: { lat: number; lng: number }
  coverImage: string | null
  phoneNumber: string | null
  website: string | null
  googleMapsUrl: string | null
  googleRating: number | null
  ownerId: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface RestaurantClaim {
  id: string
  restaurantId: string
  restaurantName: string
  userId: string
  userName: string
  userEmail: string
  phone: string
  role: ClaimantRole
  proofDocumentUrl: string | null
  status: RestaurantClaimStatus
  adminId: string | null
  adminNote: string | null
  createdAt: string
}

export interface Dish {
  id: string
  restaurantId: string
  restaurantName: string
  cuisines: string[]
  area: string
  name: string
  nameLower: string // always name.toLowerCase() — used for search
  description: string | null
  category: DishCategory
  dietary: DietaryType
  priceRange: PriceRange | null
  coverImage: string | null
  avgTaste: number
  avgPortion: number
  avgValue: number
  avgOverall: number
  reviewCount: number
  topTags: string[]
  isActive: boolean
  createdAt: string
}

export interface Review {
  id: string
  dishId: string
  restaurantId: string
  userId: string
  userName: string
  userLevel: UserLevel
  userAvatarUrl: string | null
  photoUrl: string
  tasteRating: number
  portionRating: number
  valueRating: number
  tags: string[]
  text: string | null
  helpfulVotes: number
  helpfulVotedBy: string[]
  isFlagged: boolean
  isApproved: boolean
  editedAt: string | null
  createdAt: string
}

export interface User {
  id: string
  displayName: string
  email: string
  avatarUrl: string | null
  city: string
  level: UserLevel
  reviewCount: number
  helpfulVotesReceived: number
  badges: BadgeId[]
  isAdmin: boolean
  isPremium: boolean
  premiumSince: string | null
  dishPointsBalance: number
  totalPointsEarned: number
  totalPointsRedeemed: number
  createdAt: string
}

export interface WishlistItem {
  dishId: string
  dishName: string
  restaurantId: string
  restaurantName: string
  coverImage: string | null
  avgOverall: number
  savedAt: string
}

export interface DishRequest {
  id: string
  restaurantId: string
  restaurantName: string
  dishName: string
  description: string | null
  requestedBy: string
  requestedByName: string
  status: DishRequestStatus
  adminId: string | null
  adminNote: string | null
  createdAt: string
}

export type NotificationType = 'badge_earned' | 'helpful_vote' | 'review_approved' | 'system'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  createdAt: string
}

// ── Form types ────────────────────────────────────────────
export interface ReviewFormData {
  dishId: string
  restaurantId: string
  photoFile: File | null
  photoPreviewUrl: string | null
  tasteRating: number | null
  portionRating: number | null
  valueRating: number | null
  tags: string[]
  text: string
}

// ── Search types ──────────────────────────────────────────
export interface SearchFilters {
  query: string
  city: string | null
  cuisine: string | null
  dietary: DietaryType | null
  priceRange: PriceRange | null
  minRating: number | null
  area: string | null
  sortBy: SortOrder
}

// ── API response types ────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[]
  lastDoc: string | null
  hasMore: boolean
}

/** Review form data after validation — ratings are guaranteed non-null. */
export interface ValidatedReviewData {
  dishId: string
  restaurantId: string
  tasteRating: number
  portionRating: number
  valueRating: number
  tags: string[]
  text: string
}

/** Badge display metadata. */
export interface BadgeDefinition {
  id: BadgeId
  label: string
  description: string
  icon: string
}

/** Fields safe to update via the user profile settings page. */
export interface UserProfileUpdate {
  displayName?: string
  avatarUrl?: string | null
  city?: string
  area?: string
  favoriteCuisines?: string[]
}

// ── Admin types ───────────────────────────────────────────
export interface AdminStats {
  totalRestaurants: number
  totalDishes: number
  totalReviews: number
  pendingRequests: number
  flaggedReviews: number
  totalUsers: number
}
