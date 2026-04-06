# DishPoints Rewards System

Complete specification of the DishPoints economy: earning, streaks, redemption, and audit trail.

## Overview

DishPoints are the in-app currency that incentivizes quality reviews and drives engagement. Users earn points by writing reviews and can redeem them for restaurant coupons.

## Ledger Schema

All point movements are recorded as `DishPointTransaction` documents in the `users/{userId}/pointTransactions` subcollection.

```typescript
interface DishPointTransaction {
  id: string
  userId: string
  type: 'REVIEW_BASIC' | 'REVIEW_FULL' | 'STREAK_BONUS' | 'REDEMPTION' | 'ADMIN_ADJUSTMENT'
  points: number          // Positive for earning, negative for redemption
  refId: string | null    // reviewId for earning, couponClaimId for redemption
  description: string
  createdAt: Timestamp
}
```

The user document (`users/{userId}`) maintains a denormalized `dishPointsBalance` field for fast reads. This must always equal `SUM(pointTransactions.points)`.

## Transaction Types

### REVIEW_BASIC (10 points)

Awarded when a user submits any review. The minimum viable review requires ratings for taste, portion, and value.

### REVIEW_FULL (25 points)

Awarded instead of REVIEW_BASIC when the review includes all of:
- At least one photo
- At least one tag
- Text of 30+ characters (`REVIEW_FULL_MIN_TEXT_LENGTH`)

### STREAK_BONUS

Awarded when the user's consecutive-day review count hits a multiple of 7 (`STREAK_DAYS_REQUIRED`).

**Streak calculation:**
1. Fetch the 50 most recent point transactions for the user.
2. Filter to `REVIEW_BASIC` and `REVIEW_FULL` types only.
3. Extract unique calendar days (UTC).
4. Count consecutive days backwards from the most recent review day.
5. If streak >= 7 and streak is a multiple of 7, award a bonus.

**Bonus amount:** `basePoints * (POINTS_STREAK_MULTIPLIER - 1)` = base points * 1 = same as the base review points (effectively a 2x multiplier).

### REDEMPTION (negative)

Created when a user redeems points for a coupon. Points value is `-coupon.pointsCost`.

The redemption is atomic:
1. Verify `dishPointsBalance >= coupon.pointsCost`
2. Verify `coupon.claimedCount < coupon.totalStock`
3. Within a Firestore transaction:
   - Decrement `users/{userId}.dishPointsBalance`
   - Increment `coupons/{couponId}.claimedCount`
   - Create `REDEMPTION` transaction
   - Create `couponClaims/{claimId}` with a unique code

If any step fails, the entire transaction rolls back.

### ADMIN_ADJUSTMENT

Manual adjustment by an admin. Used for corrections, goodwill credits, or balance fixes. Must include a description explaining the reason.

## Points Constants

| Constant | Value | Description |
|---|---|---|
| `POINTS_REVIEW_BASIC` | 10 | Points for a basic review |
| `POINTS_REVIEW_FULL` | 25 | Points for a full review (photo + tags + text) |
| `POINTS_STREAK_MULTIPLIER` | 2 | Multiplier applied at streak milestones |
| `STREAK_DAYS_REQUIRED` | 7 | Consecutive days needed for a streak bonus |
| `REVIEW_FULL_MIN_TEXT_LENGTH` | 30 | Minimum characters for a "full" review |
| `DEFAULT_COUPON_POINTS_COST` | 500 | Default cost of a coupon |

## Milestone Notifications

The system sends push notifications at key earning milestones to keep users engaged:

| Milestone | Points | Notification |
|---|---|---|
| Halfway | 250 total earned | "Halfway to your coupon!" |
| Almost there | 450 total earned | "50 points to go!" |

These are triggered in the `rewardPointsForReview` function by comparing the user's total earned points before and after the current award.

## Coupon Schema

```typescript
interface Coupon {
  id: string
  title: string
  restaurantId: string
  restaurantName: string
  discountValue: number        // e.g., 100 for ₹100 off
  discountType: 'flat' | 'percent'
  pointsCost: number           // DishPoints required to redeem
  totalStock: number
  claimedCount: number
  isActive: boolean
  expiresAt: Timestamp | null
  createdAt: Timestamp
}

interface CouponClaim {
  id: string
  userId: string
  couponId: string
  couponTitle: string
  code: string                 // Unique redemption code (shown to user)
  isRedeemed: boolean
  claimedAt: Timestamp
  expiresAt: Timestamp | null
}
```

## Counter Fields on User Doc

The user document (`users/{userId}`) maintains three server-managed counter fields for fast balance reads:

| Field | Type | Description |
|---|---|---|
| `dishPointsBalance` | number | Current spendable balance (= totalEarned - totalRedeemed) |
| `totalPointsEarned` | number | Lifetime points earned (sum of all positive transactions) |
| `totalPointsRedeemed` | number | Lifetime points spent (sum of absolute values of negative transactions) |

These counters are atomically updated alongside every `DishPointTransaction` write
using `FieldValue.increment()`. They are **not** client-writable — the Firestore
`isProfileUpdate()` allowlist deliberately excludes them. The admin SDK bypasses rules
entirely, so server-side writes work as expected.

### Migration: Deploying Counter Fields

A one-time backfill is required to populate `totalPointsEarned` and `totalPointsRedeemed`
for existing users before deploying the counter-based `getBalance()` code.

**Deployment order:**

1. **Deploy Firestore rules first.** Ensure `totalPointsEarned` and `totalPointsRedeemed`
   are absent from the `isProfileUpdate()` allowlist (already the case — no change needed).
2. **Run the backfill script** against production:
   ```bash
   npx tsx scripts/backfill-points-counters.ts --dry-run   # verify first
   npx tsx scripts/backfill-points-counters.ts              # then run for real
   ```
   This script iterates all users, scans their `pointTransactions` subcollection once,
   computes the totals, and writes them to the user doc.
3. **Deploy app code.** The new `getBalance()` reads only the user doc (1 Firestore read
   per call instead of scanning the entire transaction subcollection).

If app code is deployed before the backfill runs, `getBalance()` returns 0 for
`totalEarned` and `totalRedeemed` (it falls back to `?? 0`). This is safe but
will show incorrect totals on the rewards page until the backfill completes.

## Balance Reconciliation

If a balance discrepancy is suspected:

1. Query all `users/{userId}/pointTransactions` documents.
2. Sum the `points` field across all documents.
3. Compare with `users/{userId}.dishPointsBalance`.
4. If they differ, update the balance to the computed sum and create an `ADMIN_ADJUSTMENT` transaction to record the correction.

## Badge System (Separate from Points)

Badges are earned based on review count and helpful votes, not DishPoints:

| Badge | Condition |
|---|---|
| `first-bite` | 1+ reviews |
| `regular` | 5+ reviews |
| `dish-explorer` | 10+ reviews |
| `food-critic` | 25+ reviews |
| `legend` | 50+ reviews |
| `helpful` | 10+ helpful votes received |
| `trusted` | 50+ helpful votes received |

User levels are also review-count based:
- **Newbie**: 0–4 reviews
- **Foodie**: 5–19 reviews
- **Critic**: 20–49 reviews
- **Legend**: 50+ reviews
