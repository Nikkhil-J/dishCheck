'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, limit, updateDoc, doc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase/config'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { User } from '@/lib/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc'), limit(100)))
      .then((snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggleAdmin(user: User) {
    await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { isAdmin: !user.isAdmin })
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u))
  }

  async function togglePremium(user: User) {
    await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { isPremium: !user.isPremium })
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isPremium: !u.isPremium } : u))
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Users</h1>
      <p className="mt-1 text-sm text-gray-500">{users.length} users</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Level</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Reviews</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Flags</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.level}</td>
                <td className="px-4 py-3 text-gray-600">{user.reviewCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {user.isAdmin && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Admin</span>}
                    {user.isPremium && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Premium</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => toggleAdmin(user)} className="text-xs text-brand hover:underline">
                      {user.isAdmin ? 'Revoke admin' : 'Make admin'}
                    </button>
                    <button onClick={() => togglePremium(user)} className="text-xs text-amber-600 hover:underline">
                      {user.isPremium ? 'Revoke premium' : 'Grant premium'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
