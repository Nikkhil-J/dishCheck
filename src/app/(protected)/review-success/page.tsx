'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BADGE_DEFINITIONS } from '@/lib/constants'
import type { BadgeDefinition } from '@/lib/constants'

interface SuccessData {
  dishId: string
  dishName: string
  restaurantName: string
  newBadges: BadgeDefinition[]
  newReviewCount: number
}

export default function ReviewSuccessPage() {
  const router = useRouter()
  const [data, setData] = useState<SuccessData | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('reviewSuccess')
    if (!raw) { router.replace('/home'); return }
    try {
      const parsed = JSON.parse(raw)
      setData(parsed)
      sessionStorage.removeItem('reviewSuccess')
    } catch {
      router.replace('/home')
    }
  }, [router])

  if (!data) return null

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Review submitted!</h1>
      <p className="mt-2 text-gray-500">
        Your review for <span className="font-medium text-gray-800">{data.dishName}</span>
        {' '}at <span className="font-medium text-gray-800">{data.restaurantName}</span> is live.
      </p>

      {data.newBadges && data.newBadges.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800">New badge{data.newBadges.length > 1 ? 's' : ''} unlocked!</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {data.newBadges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center gap-1 rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500">
        You&apos;ve written <span className="font-semibold text-brand">{data.newReviewCount}</span> review{data.newReviewCount !== 1 ? 's' : ''} total.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={`/dish/${data.dishId}`}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark text-center"
        >
          View dish page
        </Link>
        <Link
          href="/browse"
          className="w-full rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-center"
        >
          Review another dish
        </Link>
      </div>
    </div>
  )
}
