'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { updateUser } from '@/lib/firebase/users'
import { useAuthStore } from '@/lib/store/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BENGALURU_AREAS } from '@/lib/constants'

export default function SettingsPage() {
  const { user } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    const ok = await updateUser(user.id, { displayName: displayName.trim(), city })
    setSaving(false)
    if (!ok) { setError('Failed to save. Please try again.'); return }
    setUser({ ...user, displayName: displayName.trim(), city }, firebaseUser!)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Update your profile information</p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            disabled
            value={user.email}
            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Area (optional)</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Select area…</option>
            {BENGALURU_AREAS.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && <p className="text-xs text-green-600">Profile saved!</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? <LoadingSpinner size="sm" /> : 'Save changes'}
        </button>
      </form>

      <div className="mt-10 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-700">Account</h2>
        <p className="mt-1 text-xs text-gray-500">Member since {user.createdAt?.toDate().toLocaleDateString()}</p>
        <p className="mt-0.5 text-xs text-gray-500">Level: {user.level} · Reviews: {user.reviewCount}</p>
      </div>
    </div>
  )
}
