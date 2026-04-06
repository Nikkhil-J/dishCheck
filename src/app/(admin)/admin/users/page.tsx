'use client'

import { useEffect, useState } from 'react'
import { getUsers, toggleAdmin, togglePremium } from '@/lib/services/admin'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { User } from '@/lib/types'

export default function AdminUsersPage() {
  const { authUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleAdmin(user: User) {
    if (!authUser) return
    const token = await authUser.getIdToken()
    const success = await toggleAdmin(user.id, !user.isAdmin, token)
    if (success) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u))
    }
  }

  async function handleTogglePremium(user: User) {
    if (!authUser) return
    const token = await authUser.getIdToken()
    const success = await togglePremium(user.id, !user.isPremium, token)
    if (success) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isPremium: !u.isPremium } : u))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-bg-dark">Users</h1>
      <p className="mt-1 text-sm text-text-muted">{users.length} users</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-cream">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">Level</th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">Reviews</th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">Flags</th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-bg-cream">
                <td className="px-4 py-3">
                  <p className="font-medium text-bg-dark">{user.displayName}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-text-secondary">{user.level}</td>
                <td className="px-4 py-3 text-text-secondary">{user.reviewCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {user.isAdmin && <Badge className="bg-destructive/15 text-destructive">Admin</Badge>}
                    {user.isPremium && <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)]">Premium</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="link" onClick={() => handleToggleAdmin(user)} className="h-auto p-0 text-xs text-primary">
                      {user.isAdmin ? 'Revoke admin' : 'Make admin'}
                    </Button>
                    <Button variant="link" onClick={() => handleTogglePremium(user)} className="h-auto p-0 text-xs text-[var(--color-accent)]">
                      {user.isPremium ? 'Revoke premium' : 'Grant premium'}
                    </Button>
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
