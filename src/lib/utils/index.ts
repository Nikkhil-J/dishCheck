import type { Timestamp } from 'firebase/firestore'
import {
  REVIEW_EDIT_WINDOW_MS,
  REVIEW_PHOTO_MAX_MB,
  REVIEW_PHOTO_ALLOWED_TYPES,
  REVIEW_TEXT_MIN_CHARS,
} from '../constants'
import type { Dish, DishCategory, ReviewFormData } from '../types'

/**
 * Formats a numeric rating to 1 decimal place.
 * Returns "—" when the value is 0 (no reviews yet).
 */
export function formatRating(n: number): string {
  if (n === 0) return '—'
  return n.toFixed(1)
}

/**
 * Computes the overall rating as the mean of taste, portion, and value,
 * rounded to 1 decimal place.
 */
export function computeOverall(taste: number, portion: number, value: number): number {
  return Math.round(((taste + portion + value) / 3) * 10) / 10
}

/**
 * Takes an array of tag arrays (one per review) and returns the top 5 tags
 * by frequency across all reviews.
 */
export function computeTopTags(tagArrays: string[][]): string[] {
  const freq: Record<string, number> = {}
  for (const tags of tagArrays) {
    for (const tag of tags) {
      freq[tag] = (freq[tag] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
}

/**
 * Returns true if the review is still within the editable window (24 hours).
 */
export function canEditReview(createdAt: Timestamp): boolean {
  const ageMs = Date.now() - createdAt.toMillis()
  return ageMs < REVIEW_EDIT_WINDOW_MS
}

/**
 * Validates a ReviewFormData object. Returns valid flag and field-level errors.
 */
export function validateReviewForm(data: ReviewFormData): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!data.dishId)        errors.dishId        = 'Dish is required'
  if (!data.restaurantId)  errors.restaurantId  = 'Restaurant is required'
  if (!data.photoFile && !data.photoPreviewUrl) errors.photo = 'A photo is required'
  if (data.tasteRating   === null) errors.tasteRating   = 'Taste rating is required'
  if (data.portionRating === null) errors.portionRating = 'Portion rating is required'
  if (data.valueRating   === null) errors.valueRating   = 'Value rating is required'
  if (data.tags.length === 0)      errors.tags          = 'Select at least one tag'

  if (data.text && data.text.length > 0 && data.text.length < REVIEW_TEXT_MIN_CHARS) {
    errors.text = `Text must be at least ${REVIEW_TEXT_MIN_CHARS} characters if provided`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validates a photo File for type and size constraints.
 */
export function validatePhotoFile(file: File): { valid: boolean; error: string | null } {
  if (!(REVIEW_PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
  }
  const maxBytes = REVIEW_PHOTO_MAX_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return { valid: false, error: `Image must be smaller than ${REVIEW_PHOTO_MAX_MB}MB` }
  }
  return { valid: true, error: null }
}

/**
 * Formats a Firestore Timestamp as a relative time string (e.g. "2 hours ago").
 */
export function formatRelativeTime(ts: Timestamp): string {
  const diffMs   = Date.now() - ts.toMillis()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHrs  = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears  = Math.floor(diffDays / 365)

  if (diffSecs < 60)    return 'just now'
  if (diffMins < 60)    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHrs < 24)     return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`
  if (diffDays < 7)     return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  if (diffWeeks < 4)    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  if (diffMonths < 12)  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}

/**
 * Converts a string to a URL-safe lowercase slug.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Truncates a string to the given max length, appending ellipsis if cut.
 */
export function truncate(str: string, n: number): string {
  if (str.length <= n) return str
  return str.slice(0, n - 1) + '…'
}

/**
 * Groups an array of Dish objects by their category.
 */
export function groupDishesByCategory(dishes: Dish[]): Partial<Record<DishCategory, Dish[]>> {
  const result: Partial<Record<DishCategory, Dish[]>> = {}
  for (const dish of dishes) {
    if (!result[dish.category]) result[dish.category] = []
    result[dish.category]!.push(dish)
  }
  return result
}
