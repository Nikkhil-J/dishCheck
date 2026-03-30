'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/layouts/AuthShell'
import { signInWithEmail, signInWithGoogle } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/home'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signInWithEmail(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    router.push(redirect)
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle()
      router.push(redirect)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign in failed')
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account">
      <button
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>🌐</span> Sign in with Google
      </button>

      <div className="my-4 flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <hr className="flex-1 border-gray-200" />
      </div>

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
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <Link href="/forgot-password" className="mt-1 block text-right text-xs text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  )
}
