import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/services/billing'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS } from '@/lib/firebase/config'
import { FieldValue } from 'firebase-admin/firestore'
import { captureError } from '@/lib/monitoring/sentry'

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

interface WebhookPayload {
  event: string
  account_id?: string
  payload: {
    subscription?: {
      entity: {
        id: string
        customer_id: string
        notes?: { userId?: string }
        status: string
      }
    }
    payment?: {
      entity: {
        id: string
        order_id: string
        notes?: { userId?: string }
      }
    }
  }
}

async function isEventAlreadyProcessed(eventKey: string): Promise<boolean> {
  const snap = await adminDb
    .collection(COLLECTIONS.BILLING_EVENTS)
    .where('razorpayEventKey', '==', eventKey)
    .limit(1)
    .get()
  return !snap.empty
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  if (!verifyWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  try {
    switch (payload.event) {
      case 'subscription.cancelled':
      case 'subscription.expired': {
        const userId = payload.payload.subscription?.entity.notes?.userId
        const subscriptionId = payload.payload.subscription?.entity.id
        if (!userId) break

        const eventKey = `${payload.event}:${subscriptionId ?? 'unknown'}`

        if (await isEventAlreadyProcessed(eventKey)) {
          return NextResponse.json({ received: true, deduplicated: true })
        }

        await adminDb.collection(COLLECTIONS.USERS).doc(userId).update({
          isPremium: false,
          premiumSince: null,
        })

        await adminDb.collection(COLLECTIONS.BILLING_EVENTS).add({
          userId,
          type: payload.event === 'subscription.cancelled' ? 'subscription_cancelled' : 'subscription_expired',
          razorpaySubscriptionId: subscriptionId,
          razorpayEventKey: eventKey,
          createdAt: FieldValue.serverTimestamp(),
        })
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    captureError(error, { route: '/api/billing/webhook', extra: { event: payload.event } })
    return NextResponse.json({ message: 'Webhook processing failed' }, { status: 500 })
  }
}
