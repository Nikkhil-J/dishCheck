'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useReviewFormStore } from '@/lib/store/reviewFormStore'
import { getDish } from '@/lib/services/dishes'
import { getReview } from '@/lib/services/reviews'
import { uploadDishPhoto } from '@/lib/services/cloudinary'
import { validatePhotoFile } from '@/lib/utils/index'
import { getNewlyEarnedBadges } from '@/lib/gamification'
import { StarRating } from '@/components/ui/StarRating'
import { TagPill } from '@/components/ui/TagPill'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TAG_LIST } from '@/lib/constants'
import type { Dish } from '@/lib/types'
import { cn } from '@/lib/utils'

function WriteReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dishId = searchParams.get('dishId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const editReviewId = searchParams.get('editReviewId') ?? ''

  const { user, authUser } = useAuth()
  const { data, currentStep, setStep, updateField, reset } = useReviewFormStore()

  const hasUnsavedChanges = useCallback(() => {
    return !!(data.photoFile || data.tasteRating || data.portionRating || data.valueRating || data.tags.length > 0 || data.text)
  }, [data])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const [dish, setDish] = useState<Dish | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const prevDishIdRef = useRef(dishId)
  useEffect(() => {
    if (!dishId) return
    if (prevDishIdRef.current !== dishId) {
      reset()
      prevDishIdRef.current = dishId
    }
    if (dishId !== data.dishId) {
      updateField('dishId', dishId)
      updateField('restaurantId', restaurantId)
    }
    getDish(dishId).then(setDish)
  }, [dishId, restaurantId, data.dishId, updateField, reset])

  useEffect(() => {
    if (!editReviewId) return
    setIsEditMode(true)
    getReview(editReviewId).then((review) => {
      if (!review) return
      updateField('tasteRating', review.tasteRating)
      updateField('portionRating', review.portionRating)
      updateField('valueRating', review.valueRating)
      updateField('tags', review.tags)
      updateField('text', review.text ?? '')
      if (review.photoUrl) {
        setExistingPhotoUrl(review.photoUrl)
        updateField('photoPreviewUrl', review.photoUrl)
      }
      setStep(2)
    })
  }, [editReviewId, updateField, setStep])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { valid, error } = validatePhotoFile(file)
    if (!valid) { setPhotoError(error); return }
    setPhotoError(null)
    if (data.photoPreviewUrl) URL.revokeObjectURL(data.photoPreviewUrl)
    updateField('photoFile', file)
    updateField('photoPreviewUrl', URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!user || !authUser || !dishId || !data.tasteRating || !data.portionRating || !data.valueRating) return
    const token = await authUser.getIdToken()

    if (isEditMode) {
      if (!editReviewId) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(editReviewId)}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tasteRating: data.tasteRating,
            portionRating: data.portionRating,
            valueRating: data.valueRating,
            tags: data.tags,
            text: data.text,
          }),
        })
        const payload = (await res.json()) as { item?: unknown; message?: string }
        const result = payload.item
        if (!res.ok || !result) {
          const msg = payload.message ?? 'Failed to update your review. The edit window may have expired.'
          setSubmitError(msg)
          toast.error(msg)
          return
        }
        reset()
        router.push(`/dish/${dishId}`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Update failed. Please try again.'
        setSubmitError(msg)
        toast.error(msg)
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!restaurantId || !data.photoFile) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const photoUrl = await uploadDishPhoto(data.photoFile, dishId)
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dishId,
          restaurantId,
          tasteRating: data.tasteRating,
          portionRating: data.portionRating,
          valueRating: data.valueRating,
          tags: data.tags,
          text: data.text,
          photoUrl,
        }),
      })
      const payload = (await res.json()) as {
        item?: unknown
        message?: string
        pointsAwarded?: number
        newBalance?: number
        isFullReview?: boolean
      }
      const result = payload.item

      if (!res.ok || !result) {
        const msg = payload.message ?? 'Failed to save your review. Please try again.'
        setSubmitError(msg)
        toast.error(msg)
        return
      }

      const newBadges = getNewlyEarnedBadges(
        user.reviewCount,
        user.reviewCount + 1,
        user.helpfulVotesReceived,
        user.helpfulVotesReceived,
      )
      sessionStorage.setItem('reviewSuccess', JSON.stringify({
        dishId,
        dishName: dish?.name,
        restaurantName: dish?.restaurantName,
        newBadges,
        newReviewCount: user.reviewCount + 1,
        pointsAwarded: payload.pointsAwarded ?? 0,
        newBalance: payload.newBalance ?? 0,
        isFullReview: payload.isFullReview ?? false,
      }))
      reset()
      router.push('/review-success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const steps = isEditMode ? ['Rate & Tag', 'Write'] : ['Photo', 'Rate & Tag', 'Write']

  if (!dishId) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <span className="text-5xl">🍽️</span>
        <h1 className="mt-4 font-display text-xl font-bold text-bg-dark">Which dish are you reviewing?</h1>
        <p className="mt-2 text-sm text-text-secondary">Find a dish first, then tap &quot;Write a Review&quot; from its page.</p>
        <Button
          render={<Link href="/explore" />}
          className="mt-6 h-auto rounded-pill px-6 py-3 text-sm font-semibold hover:bg-primary-dark"
        >
          Explore Dishes
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      {/* Dish context */}
      {dish && (
        <div className="mb-6 flex items-center gap-3">
          {dish.coverImage && (
            <Image src={dish.coverImage} alt={dish.name} width={48} height={48} className="h-12 w-12 rounded-md object-cover" />
          )}
          <div>
            <h1 className="font-display text-lg font-bold text-bg-dark">
              {isEditMode ? `Editing review: ${dish.name}` : dish.name}
            </h1>
            <p className="text-xs text-text-muted">{dish.restaurantName}</p>
          </div>
        </div>
      )}
      {isEditMode && existingPhotoUrl && (
        <div className="mb-6 overflow-hidden rounded-xl">
          <Image src={existingPhotoUrl} alt="Your review photo" width={600} height={200} className="h-40 w-full object-cover" />
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-1">
        {steps.map((label, i) => {
          const stepNum = isEditMode ? i + 2 : i + 1
          const isActive = currentStep === stepNum
          const isDone = currentStep > stepNum
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
                    isActive ? 'bg-primary text-white shadow-glow' :
                    isDone ? 'bg-primary text-white' : 'bg-border text-text-muted'
                  )}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('mx-1 h-0.5 flex-1 rounded-full transition-colors', isDone ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
              <span className={cn('text-[11px] font-medium', isActive ? 'text-primary' : 'text-text-muted')}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Step 1 — Photo (skip in edit mode) */}
      {currentStep === 1 && !isEditMode && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-bg-dark">Upload a photo</h2>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg-cream transition-all hover:border-primary"
          >
            {data.photoPreviewUrl ? (
              <Image src={data.photoPreviewUrl} alt="Preview" width={400} height={224} className="h-full w-full rounded-xl object-cover" />
            ) : (
              <>
                <span className="text-4xl">📸</span>
                <p className="mt-2 text-sm font-medium text-text-secondary">Click to upload a photo</p>
                <p className="text-xs text-text-muted">JPG, PNG, WebP &middot; max 5MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          {data.photoPreviewUrl && (
            <Button
              variant="ghost"
              onClick={() => { updateField('photoFile', null); updateField('photoPreviewUrl', null) }}
              className="h-auto p-0 text-xs font-medium text-text-muted hover:bg-transparent hover:text-destructive"
            >
              Remove photo
            </Button>
          )}
          {photoError && <p className="text-xs font-medium text-destructive">{photoError}</p>}
          <Button
            onClick={() => setStep(2)}
            disabled={!data.photoFile}
            className="w-full h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark hover:shadow-glow"
          >
            Next: Rate & Tag
          </Button>
        </div>
      )}

      {/* Step 2 — Ratings + Tags */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-bg-dark">{isEditMode ? 'Edit your ratings' : 'Rate this dish'}</h2>
          {[
            { label: 'Taste', field: 'tasteRating' as const, emoji: '😋' },
            { label: 'Portion', field: 'portionRating' as const, emoji: '📏' },
            { label: 'Value', field: 'valueRating' as const, emoji: '💰' },
          ].map(({ label, field, emoji }) => (
            <div key={label}>
              <Label className="mb-2 text-sm font-semibold text-text-primary">
                <span>{emoji}</span> {label}
              </Label>
              <StarRating
                value={data[field] ?? 0}
                onChange={(v) => updateField(field, v)}
                size="lg"
              />
            </div>
          ))}

          <div>
            <Label className="mb-3 text-sm font-semibold text-text-primary">Tags (select at least 1)</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_LIST.map((tag) => (
                <TagPill
                  key={tag}
                  label={tag}
                  selected={data.tags.includes(tag)}
                  onClick={() => {
                    const next = data.tags.includes(tag)
                      ? data.tags.filter((t) => t !== tag)
                      : [...data.tags, tag]
                    updateField('tags', next)
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-auto rounded-pill border-2 py-3 text-sm font-semibold text-text-primary hover:border-primary hover:text-primary hover:bg-transparent"
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => setStep(3)}
              disabled={!data.tasteRating || !data.portionRating || !data.valueRating || data.tags.length === 0}
              className="flex-1 h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark hover:shadow-glow"
            >
              Next: Write Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Text + Submit */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-bg-dark">Write your review</h2>
          <textarea
            value={data.text}
            onChange={(e) => updateField('text', e.target.value)}
            rows={5}
            placeholder="Tell others what made this dish memorable..."
            className="w-full rounded-xl border-2 border-border bg-bg-cream px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-primary"
          />
          <div className="flex items-center justify-between text-xs">
            <span className={cn(
              'font-medium',
              data.text.length >= 30 ? 'text-[var(--color-success)]' : 'text-text-muted'
            )}>
              {data.text.length}/{30} minimum
            </span>
            {data.text.length > 0 && data.text.length < 30 && (
              <span className="font-medium text-accent">{30 - data.text.length} more characters needed</span>
            )}
          </div>
          {submitError && <p className="text-xs font-medium text-destructive">{submitError}</p>}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1 h-auto rounded-pill border-2 py-3 text-sm font-semibold text-text-primary hover:border-primary hover:text-primary hover:bg-transparent"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !data.text || data.text.length < 30}
              className="flex-1 h-auto rounded-pill py-3 text-sm font-semibold hover:bg-primary-dark hover:shadow-glow"
            >
              {submitting ? <LoadingSpinner size="sm" /> : isEditMode ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
      <WriteReviewContent />
    </Suspense>
  )
}
