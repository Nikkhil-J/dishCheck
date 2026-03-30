'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/layouts/AuthShell'
import { sendPasswordReset } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await sendPasswordReset(email)
    setLoading(false)
    if (err) { setError(err); return }
    setSent(true)
  }

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a reset link">
      {sent ? (
        <div className="text-center">
          <div className="text-4xl">📬</div>
          <p className="mt-3 font-semibold text-gray-900">Check your inbox</p>
          <p className="mt-1 text-sm text-gray-500">We sent a reset link to {email}</p>
          <Link href="/login" className="mt-4 block text-sm text-brand hover:underline">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Send reset link'}
          </button>
          <Link href="/login" className="block text-center text-xs text-gray-500 hover:underline">Back to login</Link>
        </form>
      )}
    </AuthShell>
  )
}
