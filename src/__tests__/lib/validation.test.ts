import { describe, it, expect } from 'vitest'
import { createReviewSchema, updateReviewSchema } from '@/lib/validation/review.schema'
import { dishSearchParamsSchema } from '@/lib/validation/dish.schema'
import {
  toggleAdminSchema,
  togglePremiumSchema,
  dishRequestActionSchema,
} from '@/lib/validation/admin.schema'
import { userProfileUpdateSchema } from '@/lib/validation/user.schema'
import { redeemCouponSchema, createCouponSchema } from '@/lib/validation/coupon.schema'

// ── Review schemas ────────────────────────────────────────

describe('createReviewSchema', () => {
  it('accepts a valid review body', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      tags: ['Spicy', 'Authentic'],
      text: 'This is a detailed review with enough characters to pass validation.',
      photoUrl: 'https://example.com/photo.jpg',
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects rating outside 1-5', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 6,
      portionRating: 3,
      valueRating: 5,
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects rating of 0', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 0,
      portionRating: 3,
      valueRating: 5,
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('defaults tags to empty array if missing', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: 'This is a detailed review with at least 30 characters.',
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('rejects text shorter than 30 characters', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: 'Too short',
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('strips unknown fields', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: 'This is a detailed review with at least 30 characters.',
      maliciousField: 'drop-me',
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect('maliciousField' in result.data).toBe(false)
    }
  })

  it('rejects empty dishId', () => {
    const input = {
      dishId: '',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects invalid tag values', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      tags: ['NotAValidTag'],
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('succeeds without photoUrl (optional for creation)', () => {
    const input = {
      dishId: 'dish-1',
      restaurantId: 'rest-1',
      tasteRating: 4,
      portionRating: 3,
      valueRating: 5,
      text: 'This is a detailed review with at least 30 characters.',
    }
    const result = createReviewSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('updateReviewSchema', () => {
  it('accepts partial update', () => {
    const result = updateReviewSchema.safeParse({ text: 'Updated review' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateReviewSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid rating', () => {
    const result = updateReviewSchema.safeParse({ tasteRating: 10 })
    expect(result.success).toBe(false)
  })

  it('strips unknown fields', () => {
    const result = updateReviewSchema.safeParse({ isAdmin: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('isAdmin' in result.data).toBe(false)
    }
  })
})

// ── Dish search params ────────────────────────────────────

describe('dishSearchParamsSchema', () => {
  it('accepts valid dietary value', () => {
    const result = dishSearchParamsSchema.safeParse({ dietary: 'veg' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid dietary value', () => {
    const result = dishSearchParamsSchema.safeParse({ dietary: 'meat' })
    expect(result.success).toBe(false)
  })

  it('accepts valid priceRange', () => {
    const result = dishSearchParamsSchema.safeParse({ priceRange: '200-400' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid priceRange', () => {
    const result = dishSearchParamsSchema.safeParse({ priceRange: '999' })
    expect(result.success).toBe(false)
  })

  it('defaults sortBy to highest-rated', () => {
    const result = dishSearchParamsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortBy).toBe('highest-rated')
    }
  })

  it('defaults null fields correctly', () => {
    const result = dishSearchParamsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBeNull()
      expect(result.data.city).toBeNull()
      expect(result.data.dietary).toBeNull()
    }
  })
})

// ── Admin schemas ─────────────────────────────────────────

describe('toggleAdminSchema', () => {
  it('accepts boolean isAdmin', () => {
    expect(toggleAdminSchema.safeParse({ isAdmin: true }).success).toBe(true)
    expect(toggleAdminSchema.safeParse({ isAdmin: false }).success).toBe(true)
  })

  it('rejects non-boolean isAdmin', () => {
    expect(toggleAdminSchema.safeParse({ isAdmin: 'yes' }).success).toBe(false)
    expect(toggleAdminSchema.safeParse({ isAdmin: 1 }).success).toBe(false)
    expect(toggleAdminSchema.safeParse({}).success).toBe(false)
  })

  it('strips unknown fields', () => {
    const result = toggleAdminSchema.safeParse({ isAdmin: true, extra: 'drop' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extra' in result.data).toBe(false)
    }
  })
})

describe('togglePremiumSchema', () => {
  it('accepts boolean isPremium', () => {
    expect(togglePremiumSchema.safeParse({ isPremium: true }).success).toBe(true)
    expect(togglePremiumSchema.safeParse({ isPremium: false }).success).toBe(true)
  })

  it('rejects non-boolean isPremium', () => {
    expect(togglePremiumSchema.safeParse({ isPremium: 'yes' }).success).toBe(false)
  })
})

describe('dishRequestActionSchema', () => {
  it('accepts approve action', () => {
    const result = dishRequestActionSchema.safeParse({ action: 'approve' })
    expect(result.success).toBe(true)
  })

  it('accepts reject action with note', () => {
    const result = dishRequestActionSchema.safeParse({
      action: 'reject',
      note: 'Duplicate dish',
    })
    expect(result.success).toBe(true)
  })

  it('accepts approve with optional category and dietary', () => {
    const result = dishRequestActionSchema.safeParse({
      action: 'approve',
      category: 'Main Course',
      dietary: 'veg',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid action', () => {
    const result = dishRequestActionSchema.safeParse({ action: 'delete' })
    expect(result.success).toBe(false)
  })

  it('rejects missing action', () => {
    const result = dishRequestActionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid category', () => {
    const result = dishRequestActionSchema.safeParse({
      action: 'approve',
      category: 'Not A Real Category',
    })
    expect(result.success).toBe(false)
  })
})

// ── User profile schema ──────────────────────────────────

describe('userProfileUpdateSchema', () => {
  it('accepts valid profile update', () => {
    const result = userProfileUpdateSchema.safeParse({
      displayName: 'Alice',
      city: 'Bengaluru',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = userProfileUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty displayName', () => {
    const result = userProfileUpdateSchema.safeParse({ displayName: '' })
    expect(result.success).toBe(false)
  })

  it('strips unknown fields like isAdmin', () => {
    const result = userProfileUpdateSchema.safeParse({
      displayName: 'Alice',
      isAdmin: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('isAdmin' in result.data).toBe(false)
    }
  })
})

// ── Coupon schemas ────────────────────────────────────────

describe('redeemCouponSchema', () => {
  it('accepts valid couponId', () => {
    const result = redeemCouponSchema.safeParse({ couponId: 'coupon-1' })
    expect(result.success).toBe(true)
  })

  it('rejects empty couponId', () => {
    const result = redeemCouponSchema.safeParse({ couponId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing couponId', () => {
    const result = redeemCouponSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('strips unknown fields', () => {
    const result = redeemCouponSchema.safeParse({ couponId: 'c1', hack: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('hack' in result.data).toBe(false)
    }
  })
})

describe('createCouponSchema', () => {
  const validCoupon = {
    title: '₹50 off',
    restaurantId: 'rest-1',
    restaurantName: 'Test Restaurant',
    discountValue: 50,
    discountType: 'flat' as const,
    pointsCost: 500,
    totalStock: 3,
    expiresAt: null,
    codes: ['CODE-1', 'CODE-2', 'CODE-3'],
  }

  it('accepts valid coupon creation', () => {
    const result = createCouponSchema.safeParse(validCoupon)
    expect(result.success).toBe(true)
  })

  it('rejects when codes count < totalStock', () => {
    const result = createCouponSchema.safeParse({
      ...validCoupon,
      totalStock: 5,
      codes: ['CODE-1', 'CODE-2'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid discountType', () => {
    const result = createCouponSchema.safeParse({
      ...validCoupon,
      discountType: 'bogus',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero pointsCost', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, pointsCost: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty codes array', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, codes: [] })
    expect(result.success).toBe(false)
  })
})
