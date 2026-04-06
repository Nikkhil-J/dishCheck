'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/layouts/AuthShell'
import { signInWithEmail, signInWithGoogle } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/home'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push(redirect)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full gap-2.5 rounded-lg border-2 py-3 font-semibold"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>

      <div className="my-6 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-text-muted">or</span>
        <hr className="flex-1 border-border" />
      </div>

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
        <div>
          <Label htmlFor="password" className="mb-1.5 font-semibold text-text-primary">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0"
          />
          <Link href="/forgot-password" className="mt-1.5 block text-right text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full rounded-lg py-3 font-semibold">
          {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href={redirect !== '/home' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} className="font-semibold text-primary hover:underline">Sign up</Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account">
      <Suspense fallback={<div className="flex justify-center py-4"><LoadingSpinner /></div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
