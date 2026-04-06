import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { FieldValue } from 'firebase-admin/firestore'
import { env } from '@/lib/env'
import { PLAN_PRICES } from '@/lib/constants'

const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID ?? ''
const RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET ?? ''

const PLANS = {
  monthly: { amount: PLAN_PRICES.monthly, currency: 'INR', description: 'DishCheck Premium — Monthly' },
  yearly:  { amount: PLAN_PRICES.yearly,  currency: 'INR', description: 'DishCheck Premium — Yearly' },
} as const

export type PlanType = keyof typeof PLANS

export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID
}

export function getPlanDetails(plan: PlanType) {
  return PLANS[plan]
}

export async function createOrder(plan: PlanType): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }

  const planDetails = PLANS[plan]
  const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: planDetails.amount,
      currency: planDetails.currency,
      notes: { plan },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Razorpay order creation failed: ${response.status} ${body}`)
  }

  const data = await response.json() as { id: string }

  return {
    orderId: data.id,
    amount: planDetails.amount,
    currency: planDetails.currency,
    keyId: RAZORPAY_KEY_ID,
  }
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!RAZORPAY_KEY_SECRET) return false

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  )
}

export async function activatePremium(userId: string, paymentId: string, orderId: string, plan: PlanType): Promise<void> {
  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId)
  const eventRef = adminDb.collection(COLLECTIONS.BILLING_EVENTS).doc()

  const batch = adminDb.batch()

  batch.update(userRef, {
    isPremium: true,
    premiumSince: FieldValue.serverTimestamp(),
  })

  batch.set(eventRef, {
    userId,
    type: 'subscription_activated',
    plan,
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
    amount: PLANS[plan].amount,
    currency: PLANS[plan].currency,
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  )
}
