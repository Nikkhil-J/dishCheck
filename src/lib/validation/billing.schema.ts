import { z } from 'zod'

export const createOrderSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
}).strip()

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
}).strip()

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
