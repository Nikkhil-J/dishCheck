'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

const FEATURES = [
  { icon: '📊', label: 'Dish comparison', description: 'Compare two dishes side-by-side on all metrics' },
  { icon: '🔖', label: 'Unlimited wishlist', description: 'Save as many dishes as you like' },
  { icon: '🏷️', label: 'Priority badge display', description: 'Stand out with a premium badge on your reviews' },
  { icon: '📈', label: 'Advanced stats', description: 'See your reviewing trends and streaks over time' },
]

export default function UpgradePage() {
  const { user } = useAuth()

  if (user?.isPremium) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">⭐</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">You&apos;re already Premium!</h1>
        <p className="mt-2 text-gray-500">Enjoy all premium features, and thank you for supporting DishCheck.</p>
        <Link href="/home" className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          Go home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="text-center">
        <div className="text-4xl">🚀</div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Upgrade to Premium</h1>
        <p className="mt-2 text-gray-500">Unlock powerful features for food enthusiasts.</p>
      </div>

      <div className="mt-8 space-y-3">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="font-medium text-gray-900">{f.label}</p>
              <p className="text-sm text-gray-500">{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-brand p-6 text-center text-white">
        <p className="text-3xl font-bold">₹199<span className="text-base font-normal opacity-80"> / month</span></p>
        <p className="mt-1 text-sm opacity-80">Cancel anytime</p>
        <button
          onClick={() => alert('Payment integration coming soon!')}
          className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          Get Premium
        </button>
      </div>
    </div>
  )
}
