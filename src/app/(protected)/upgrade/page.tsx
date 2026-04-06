'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Script from 'next/script'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: '📊', label: 'Dish comparison', description: 'Compare two dishes side-by-side on all metrics' },
  { icon: '🏷️', label: 'Priority badge display', description: 'Stand out with a premium badge on your reviews' },
  { icon: '📈', label: 'Advanced stats', description: 'See your reviewing trends and streaks over time' },
  { icon: '🔓', label: 'Early access', description: 'Be the first to try new DishCheck features' },
]

type PlanType = 'monthly' | 'yearly'

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export default function UpgradePage() {
  const { user, authUser } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePayment = useCallback(async () => {
    if (!authUser) return
    setLoading(true)
    setError(null)

    try {
      const token = await authUser.getIdToken()
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({ message: 'Failed to create order' }))
        throw new Error(data.message || 'Failed to create order')
      }

      const { orderId, amount, currency, keyId } = await orderRes.json() as {
        orderId: string
        amount: number
        currency: string
        keyId: string
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'DishCheck',
        description: selectedPlan === 'monthly' ? 'Premium — Monthly' : 'Premium — Yearly',
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await authUser.getIdToken()}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed')
            }

            setSuccess(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          email: user?.email ?? '',
          name: user?.displayName ?? '',
        },
        theme: { color: '#E23744' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }, [authUser, selectedPlan, user])

  if (success || user?.isPremium) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="text-5xl">⭐</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-bg-dark">
          {success ? 'Welcome to Premium!' : "You're already Premium!"}
        </h1>
        <p className="mt-2 text-text-secondary">
          Enjoy all premium features, and thank you for supporting DishCheck.
        </p>
        <Button
          render={<Link href="/home" />}
          className="mt-6 h-auto rounded-pill px-6 py-2.5 text-sm font-semibold hover:bg-primary-dark"
        >
          Go home
        </Button>
      </div>
    )
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="mx-auto max-w-md px-6 py-10">
        <div className="text-center">
          <div className="text-4xl">🚀</div>
          <h1 className="mt-3 font-display text-2xl font-bold text-bg-dark">Upgrade to Premium</h1>
          <p className="mt-2 text-text-secondary">Unlock powerful features for food enthusiasts.</p>
        </div>

        <div className="mt-8 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-medium text-bg-dark">{f.label}</p>
                <p className="text-sm text-text-secondary">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setSelectedPlan('monthly')}
            className={`flex-1 h-auto rounded-xl border-2 p-4 ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5 hover:bg-primary/5'
                : 'border-border bg-card hover:bg-card'
            }`}
          >
            <div className="text-center">
              <p className="font-display text-xl font-bold text-bg-dark">₹199</p>
              <p className="text-xs text-text-secondary">per month</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedPlan('yearly')}
            className={`flex-1 h-auto rounded-xl border-2 p-4 ${
              selectedPlan === 'yearly'
                ? 'border-primary bg-primary/5 hover:bg-primary/5'
                : 'border-border bg-card hover:bg-card'
            }`}
          >
            <div className="text-center">
              <p className="font-display text-xl font-bold text-bg-dark">₹1,999</p>
              <p className="text-xs text-text-secondary">per year</p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-success)]">Save 16%</p>
            </div>
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>
        )}

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="mt-6 w-full h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark"
        >
          {loading ? 'Processing...' : `Subscribe — ₹${selectedPlan === 'monthly' ? '199/mo' : '1,999/yr'}`}
        </Button>

        <p className="mt-3 text-center text-xs text-text-secondary">
          Secure payment via Razorpay. Cancel anytime.
        </p>
      </div>
    </>
  )
}
