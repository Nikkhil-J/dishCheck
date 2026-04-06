'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { updateUser } from '@/lib/services/users'
import { useAuthStore } from '@/lib/store/authStore'
import { CUISINE_TYPES, CITY_AREAS, CUISINE_EMOJI, SUPPORTED_CITIES, type City } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/home'
  const { user } = useAuth()
  const authUser = useAuthStore((s) => s.authUser)
  const setUser = useAuthStore((s) => s.setUser)
  const [step, setStep] = useState(1)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleCuisine(c: string) {
    setSelectedCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  async function handleComplete() {
    if (!user) { router.push(redirectTo); return }
    setSaving(true)
    const updates: Parameters<typeof updateUser>[1] = {}
    if (selectedCuisines.length > 0) updates.favoriteCuisines = selectedCuisines
    if (selectedCity) updates.city = selectedCity
    if (selectedArea) updates.area = selectedArea
    await updateUser(user.id, updates)
    setUser({ ...user, city: selectedCity ?? user.city }, authUser)
    setSaving(false)
    router.push(redirectTo)
  }

  const areas: readonly string[] = selectedCity ? CITY_AREAS[selectedCity] ?? [] : []

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>

        {/* Step 1: Cuisine preferences */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-bold text-bg-dark">
              What cuisines do you love?
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Pick your favourites to personalize your feed.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {CUISINE_TYPES.map((c) => (
                <Button
                  key={c}
                  variant="outline"
                  onClick={() => toggleCuisine(c)}
                  className={cn(
                    'h-auto justify-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium',
                    selectedCuisines.includes(c)
                      ? 'border-primary bg-primary-light text-primary-dark hover:bg-primary-light'
                      : 'border-border bg-card text-text-secondary hover:border-primary/50'
                  )}
                >
                  <span>{CUISINE_EMOJI[c] ?? '🍴'}</span>
                  {c}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={selectedCuisines.length === 0}
              className="mt-8 w-full h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark"
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(redirectTo)}
              className="mt-3 w-full h-auto text-sm text-text-muted hover:text-text-secondary hover:bg-transparent"
            >
              Skip for now
            </Button>
          </div>
        )}

        {/* Step 2: City/Area */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-2xl font-bold text-bg-dark">
              Where are you based?
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              We&apos;ll show you dishes near you.
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                {SUPPORTED_CITIES.map((city) => (
                  <Button
                    key={city}
                    variant="outline"
                    onClick={() => { setSelectedCity(city); setSelectedArea(null) }}
                    className={cn(
                      'flex-1 h-auto rounded-lg border-2 py-3 text-center text-sm font-semibold',
                      selectedCity === city
                        ? 'border-primary bg-primary text-white hover:bg-primary hover:text-white'
                        : 'border-border bg-card text-text-primary hover:border-primary'
                    )}
                  >
                    {city}
                  </Button>
                ))}
              </div>
              {areas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <Button
                      key={area}
                      variant="outline"
                      onClick={() => setSelectedArea(area)}
                      className={cn(
                        'h-auto rounded-pill border px-3 py-1.5 text-xs font-medium',
                        selectedArea === area
                          ? 'border-primary bg-primary text-white hover:bg-primary hover:text-white'
                          : 'border-border bg-card text-text-secondary hover:border-primary'
                      )}
                    >
                      {area}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-auto rounded-pill border-2 border-border py-3 text-sm font-semibold text-text-primary hover:border-primary hover:text-primary hover:bg-transparent"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedCity}
                className="flex-1 h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center">
            <div className="text-6xl">🎉</div>
            <h1 className="mt-5 font-display text-3xl font-bold text-bg-dark">
              You&apos;re all set!
            </h1>
            <p className="mt-3 text-text-secondary">
              Welcome{user ? `, ${user.displayName.split(' ')[0]}` : ''}! Start discovering amazing dishes.
            </p>
            <Button
              onClick={handleComplete}
              disabled={saving}
              className="mt-8 w-full h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark hover:shadow-glow"
            >
              {saving ? 'Saving...' : 'Start Exploring'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
