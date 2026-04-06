import type { UserLevel, BadgeId, BadgeDefinition } from './types'
import { BADGE_DEFINITIONS } from './constants'

/** Returns the UserLevel for a given review count. */
export function computeLevel(reviewCount: number): UserLevel {
  if (reviewCount >= 50) return 'Legend'
  if (reviewCount >= 20) return 'Critic'
  if (reviewCount >= 5)  return 'Foodie'
  return 'Newbie'
}

/** Returns array of earned badge IDs based on review count and helpful votes. */
export function computeEarnedBadges(reviewCount: number, helpfulVotes: number): BadgeId[] {
  const earned: BadgeId[] = []
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
