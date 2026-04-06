'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/layouts/AuthShell'
import { sendPasswordReset } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
          <div className="text-5xl">📬</div>
          <p className="mt-4 font-display text-lg font-bold text-bg-dark">Check your inbox</p>
          <p className="mt-2 text-sm text-text-secondary">
            We sent a reset link to <strong>{email}</strong>
          </p>
          <Button className="mt-6 rounded-pill px-6 font-semibold" render={<Link href="/login" />}>
            Back to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-1.5 font-semibold text-text-primary">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0"
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full rounded-lg py-3 font-semibold">
            {loading ? <LoadingSpinner size="sm" /> : 'Send reset link'}
          </Button>
          <Link href="/login" className="block text-center text-sm text-text-muted hover:text-primary hover:underline">
            Back to login
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
