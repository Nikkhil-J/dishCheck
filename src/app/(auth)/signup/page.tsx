'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/layouts/AuthShell'
import { signUpWithEmail, signInWithGoogle } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const err = await signUpWithEmail(email, password, name)
    setLoading(false)
    if (err) { setError(err); return }
    router.push('/home')
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle()
      router.push('/home')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign up failed')
    }
  }

  return (
    <AuthShell title="Create an account" subtitle="Join DishCheck and start reviewing">
      <button
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>🌐</span> Sign up with Google
      </button>

      <div className="my-4 flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Display name', value: name, set: setName, type: 'text' },
          { label: 'Email', value: email, set: setEmail, type: 'email' },
          { label: 'Password (min 8 chars)', value: password, set: setPassword, type: 'password' },
          { label: 'Confirm password', value: confirm, set: setConfirm, type: 'password' },
        ].map(({ label, value, set, type }) => (
          <div key={label}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              type={type}
              required
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  )
}
