import { z } from 'zod'

export const redeemCouponSchema = z.object({
  couponId: z.string().min(1),
}).strip()

export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>

export const createCouponSchema = z.object({
  title: z.string().min(1).max(200),
  restaurantId: z.string().min(1),
  restaurantName: z.string().min(1),
  discountValue: z.number().positive(),
  discountType: z.enum(['flat', 'percent']),
  pointsCost: z.number().int().positive(),
  totalStock: z.number().int().positive(),
  expiresAt: z.string().datetime().nullable().default(null),
  codes: z.array(z.string().min(1)).min(1),
}).strip().refine(
  (data) => data.codes.length >= data.totalStock,
  { message: 'Must provide at least as many codes as totalStock', path: ['codes'] },
)

export type CreateCouponInput = z.infer<typeof createCouponSchema>
