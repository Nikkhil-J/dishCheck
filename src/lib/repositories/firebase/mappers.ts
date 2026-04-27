import type { Dish, DishRequest, Notification, Restaurant, Review, User, WishlistItem } from '@/lib/types'

type MaybeTimestamp = { toDate?: () => Date } | Date | string | null | undefined

function toIso(value: MaybeTimestamp): string {
  if (!value) return new Date(0).toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return new Date(0).toISOString()
}

function toIsoOrNull(value: MaybeTimestamp): string | null {
  if (!value) return null
  return toIso(value)
}

export function mapRestaurant(entity: Restaurant): Restaurant {
  return {
    ...entity,
    phoneNumber: entity.phoneNumber ?? null,
    website: entity.website ?? null,
    googleMapsUrl: entity.googleMapsUrl ?? null,
    googleRating: entity.googleRating ?? null,
    ownerId: entity.ownerId ?? null,
    isVerified: entity.isVerified ?? false,
    createdAt: toIso(entity.createdAt as MaybeTimestamp),
  }
}

export function mapDish(entity: Dish): Dish {
  return { ...entity, createdAt: toIso(entity.createdAt as MaybeTimestamp) }
}

export function mapReview(entity: Review): Review {
  return {
    ...entity,
    photoUrl: entity.photoUrl ?? null,
    billUrl: entity.billUrl ?? null,
    isVerified: entity.isVerified ?? false,
    createdAt: toIso(entity.createdAt as MaybeTimestamp),
    editedAt: toIsoOrNull(entity.editedAt as MaybeTimestamp),
  }
}

export function mapUser(entity: User): User {
  return {
    ...entity,
    dishPointsBalance: entity.dishPointsBalance ?? 0,
    totalPointsEarned: entity.totalPointsEarned ?? 0,
    totalPointsRedeemed: entity.totalPointsRedeemed ?? 0,
    createdAt: toIso(entity.createdAt as MaybeTimestamp),
    premiumSince: toIsoOrNull(entity.premiumSince as MaybeTimestamp),
  }
}

export function mapWishlistItem(entity: WishlistItem): WishlistItem {
  return { ...entity, savedAt: toIso(entity.savedAt as MaybeTimestamp) }
}

export function mapDishRequest(entity: DishRequest): DishRequest {
  return { ...entity, createdAt: toIso(entity.createdAt as MaybeTimestamp) }
}

export function mapNotification(entity: Notification): Notification {
  return { ...entity, createdAt: toIso(entity.createdAt as MaybeTimestamp) }
}
