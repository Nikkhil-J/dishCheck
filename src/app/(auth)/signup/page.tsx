'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/layouts/AuthShell'
import { signUpWithEmail, signInWithGoogle } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-destructive', 'bg-destructive', 'bg-accent', 'bg-success', 'bg-success']
  return { score, label: labels[score], color: colors[score] }
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const strength = getPasswordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const err = await signUpWithEmail(email, password, name)
    setLoading(false)
    if (err) { setError(err); return }
    router.push(redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : '/onboarding')
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push(redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : '/onboarding')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign up failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const inputCx = 'h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0'

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={loading || googleLoading}
        className="w-full gap-2.5 rounded-lg border-2 py-3 font-semibold"
      >
        {googleLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
        )}
        Sign up with Google
      </Button>

      <div className="my-6 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-text-muted">or</span>
        <hr className="flex-1 border-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="mb-1.5 font-semibold text-text-primary">Display name</Label>
          <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCx} />
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 font-semibold text-text-primary">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCx} />
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5 font-semibold text-text-primary">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCx} />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < strength.score ? strength.color : 'bg-border')} />
                ))}
              </div>
              <p className="mt-1 text-xs text-text-muted">{strength.label}</p>
            </div>
          )}
        </div>
        <div>
          <Label className="mb-1.5 font-semibold text-text-primary">Confirm password</Label>
          <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCx} />
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full rounded-lg py-3 font-semibold">
          {loading ? <LoadingSpinner size="sm" /> : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </>
  )
}

export default function SignupPage() {
  return (
    <AuthShell title="Create an account" subtitle="Join DishCheck and start reviewing">
      <Suspense fallback={<div className="flex justify-center py-4"><LoadingSpinner /></div>}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  )
}
