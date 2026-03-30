'use client'

import { useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { AdminStats } from '@/lib/types'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [restaurants, dishes, reviews, pending, flagged, users] = await Promise.all([
          getCountFromServer(query(collection(db, COLLECTIONS.RESTAURANTS), where('isActive', '==', true))),
          getCountFromServer(query(collection(db, COLLECTIONS.DISHES), where('isActive', '==', true))),
          getCountFromServer(collection(db, COLLECTIONS.REVIEWS)),
          getCountFromServer(query(collection(db, COLLECTIONS.DISH_REQUESTS), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, COLLECTIONS.REVIEWS), where('isFlagged', '==', true))),
          getCountFromServer(collection(db, COLLECTIONS.USERS)),
        ])
        setStats({
          totalRestaurants: restaurants.data().count,
          totalDishes: dishes.data().count,
          totalReviews: reviews.data().count,
          pendingRequests: pending.data().count,
          flaggedReviews: flagged.data().count,
          totalUsers: users.data().count,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  if (!stats) return null

  const cards = [
    { label: 'Restaurants', value: stats.totalRestaurants, icon: '🏪' },
    { label: 'Dishes', value: stats.totalDishes, icon: '🍽️' },
    { label: 'Reviews', value: stats.totalReviews, icon: '📝' },
    { label: 'Users', value: stats.totalUsers, icon: '👥' },
    { label: 'Pending requests', value: stats.pendingRequests, icon: '📋', highlight: stats.pendingRequests > 0 },
    { label: 'Flagged reviews', value: stats.flaggedReviews, icon: '🚩', highlight: stats.flaggedReviews > 0 },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon, highlight }) => (
          <div key={label} className={`rounded-xl border p-5 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{icon}</span>
              <span className={`text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
