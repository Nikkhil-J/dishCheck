'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useReviewFormStore } from '@/lib/store/reviewFormStore'
import { getDish } from '@/lib/services/dishes'
import { getReview } from '@/lib/services/reviews'
import { uploadDishPhoto, uploadBillPhoto } from '@/lib/services/cloudinary'
import { validatePhotoFile } from '@/lib/utils/index'
import { getNewlyEarnedBadges } from '@/lib/gamification'
import { StarRating } from '@/components/ui/StarRating'
import { TagPill } from '@/components/ui/TagPill'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  TAG_GROUPS,
  RATING_LABELS,
  SUB_RATING_LABELS,
  HTTP_HEADERS,
  REVIEW_TEXT_MIN_CHARS,
} from '@/lib/constants'
import type { Dish, ReviewFormData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants/routes'
import { API_ENDPOINTS } from '@/lib/constants/api'

const RATING_FIELDS = [
  { label: SUB_RATING_LABELS[0], field: 'tasteRating' as const, emoji: '😋', hint: 'How did it taste?' },
  { label: SUB_RATING_LABELS[1], field: 'portionRating' as const, emoji: '📏', hint: 'Was the serving size fair?' },
  { label: SUB_RATING_LABELS[2], field: 'valueRating' as const, emoji: '💰', hint: 'Worth the price?' },
] as const

function WriteReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dishId = searchParams.get('dishId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const editReviewId = searchParams.get('editReviewId') ?? ''
  const dishNameParam = searchParams.get('dishName') ?? ''
  const restaurantNameParam = searchParams.get('restaurantName') ?? ''
  const fromParam = searchParams.get('from')

  const { user, authUser } = useAuth()
  const { data, updateField, reset } = useReviewFormStore()

  const hasUnsavedChanges = useCallback(() => {
    return !!(data.photoFile || data.billFile || data.tasteRating || data.portionRating || data.valueRating || data.tags.length > 0 || data.text)
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
  const displayName = dishNameParam || dish?.name || ''
  const displayRestaurant = restaurantNameParam || dish?.restaurantName || ''
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [billError, setBillError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const billRef = useRef<HTMLInputElement>(null)

  const prevDishIdRef = useRef(dishId)
  const mountResetRef = useRef(false)
  if (!mountResetRef.current && dishId && data.dishId && data.dishId !== dishId) {
    reset()
    mountResetRef.current = true
  }

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

  const resetRef = useRef(reset)
  resetRef.current = reset
  useEffect(() => {
    return () => { resetRef.current() }
  }, [])

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
    })
  }, [editReviewId, updateField])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { valid, error } = validatePhotoFile(file)
    if (!valid) { setPhotoError(error); return }
    setPhotoError(null)
    if (data.photoPreviewUrl) URL.revokeObjectURL(data.photoPreviewUrl)
    updateField('photoFile', file)
    updateField('photoPreviewUrl', URL.createObjectURL(file))
  }

  function handleBillChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { valid, error } = validatePhotoFile(file)
    if (!valid) { setBillError(error); return }
    setBillError(null)
    if (data.billPreviewUrl) URL.revokeObjectURL(data.billPreviewUrl)
    updateField('billFile', file)
    updateField('billPreviewUrl', URL.createObjectURL(file))
  }

  function handleCancel() {
    if (fromParam) {
      router.push(decodeURIComponent(fromParam))
    } else {
      router.back()
    }
  }

  const ratingsComplete = !!(data.tasteRating && data.portionRating && data.valueRating)
  const tagsComplete = data.tags.length >= 1
  const textComplete = data.text.length >= REVIEW_TEXT_MIN_CHARS
  const canSubmit = ratingsComplete && tagsComplete && textComplete

  const completedCount = useMemo(() => {
    let count = 0
    if (ratingsComplete) count++
    if (tagsComplete) count++
    if (textComplete) count++
    return count
  }, [ratingsComplete, tagsComplete, textComplete])

  const progressPercent = Math.round((completedCount / 3) * 100)

  async function handleSubmit() {
    if (!user || !authUser || !dishId || !canSubmit) return
    const token = await authUser.getIdToken()

    if (isEditMode) {
      if (!editReviewId) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        const res = await fetch(API_ENDPOINTS.review(encodeURIComponent(editReviewId)), {
          method: 'PATCH',
          headers: {
            [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.CONTENT_TYPE_JSON,
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
        if (!res.ok || !payload.item) {
          const msg = payload.message ?? 'Failed to update your review. The edit window may have expired.'
          setSubmitError(msg)
          toast.error(msg)
          return
        }
        reset()
        router.push(ROUTES.dish(dishId))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Update failed. Please try again.'
        setSubmitError(msg)
        toast.error(msg)
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!restaurantId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (data.photoFile) {
        photoUrl = await uploadDishPhoto(data.photoFile, dishId)
      }

      let billUrl: string | undefined
      if (data.billFile) {
        billUrl = await uploadBillPhoto(data.billFile, dishId)
      }

      const res = await fetch(API_ENDPOINTS.REVIEWS, {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.CONTENT_TYPE_JSON,
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
          billUrl,
        }),
      })
      const payload = (await res.json()) as {
        item?: unknown
        message?: string
        pointsAwarded?: number
        newBalance?: number
        isFullReview?: boolean
      }

      if (!res.ok || !payload.item) {
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
        dishName: displayName,
        restaurantName: displayRestaurant,
        newBadges,
        newReviewCount: user.reviewCount + 1,
        pointsAwarded: payload.pointsAwarded ?? 0,
        newBalance: payload.newBalance ?? 0,
        isFullReview: payload.isFullReview ?? false,
      }))
      reset()
      router.push(ROUTES.REVIEW_SUCCESS)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!dishId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <span className="text-5xl">🍽️</span>
        <h1 className="mt-4 font-display text-xl font-bold text-heading">Which dish are you reviewing?</h1>
        <p className="mt-2 text-sm text-text-secondary">Find a dish first, then tap &quot;Write a Review&quot; from its page.</p>
        <Button
          render={<Link href={ROUTES.EXPLORE} />}
          className="mt-6 h-auto rounded-pill px-6 py-3 text-sm font-semibold hover:bg-primary-dark"
        >
          Explore Dishes
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">

      {/* Dish hero card */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:p-7">
        {dish?.coverImage ? (
          <Image src={dish.coverImage} alt={displayName} width={72} height={72} className="h-16 w-16 rounded-xl object-cover sm:h-[72px] sm:w-[72px]" />
        ) : displayName ? (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-3xl sm:h-[72px] sm:w-[72px]">🍽️</div>
        ) : (
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-border sm:h-[72px] sm:w-[72px]" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-heading sm:text-2xl">
            {isEditMode ? `Editing review` : displayName || <span className="inline-block h-6 w-48 animate-pulse rounded bg-border" />}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isEditMode && displayName ? displayName + ' · ' : ''}
            {displayRestaurant || <span className="inline-block h-4 w-32 animate-pulse rounded bg-border" />}
          </p>
          {dish && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
              <span>⭐ {dish.avgOverall.toFixed(1)} ({dish.reviewCount} reviews)</span>
              {dish.priceRange && <span>💰 {dish.priceRange}</span>}
              <span>🍽️ {dish.category}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded-pill border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
      </div>

      {isEditMode && existingPhotoUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <Image src={existingPhotoUrl} alt="Your review photo" width={600} height={200} className="h-40 w-full object-cover" />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

        {/* Main form */}
        <div className="space-y-10">

          {/* Section 1: Ratings */}
          <section>
            <SectionHeader num={1} done={ratingsComplete} title="How was this dish?" desc="Tap the stars. Be honest — it helps everyone decide better." />
            <div className="mt-5 flex flex-col gap-3">
              {RATING_FIELDS.map(({ label, field, emoji, hint }) => {
                const value = data[field] ?? 0
                const isRated = value > 0
                return (
                  <div
                    key={label}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] p-4 transition-all duration-300 sm:flex-nowrap sm:gap-4',
                      isRated ? 'border-brand-gold/30 bg-bg-cream' : 'border-border bg-card',
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl transition-transform duration-300',
                      isRated ? 'scale-110 bg-bg-warm' : 'bg-surface-2',
                    )}>
                      {emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="font-display text-sm font-bold text-text-primary sm:text-base">{label}</Label>
                      <p className={cn(
                        'text-xs transition-colors duration-300',
                        isRated ? 'font-semibold text-brand-gold' : 'text-text-muted',
                      )}>
                        {isRated ? RATING_LABELS[value] : hint}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <StarRating value={value} onChange={(v) => updateField(field, v)} size="lg" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 2: Tags */}
          <section>
            <SectionHeader num={2} done={tagsComplete} title="Describe it in a few words" desc="Help others know what to expect. Pick at least one." />
            <div className="mt-5 space-y-5">
              {TAG_GROUPS.map(({ label: groupLabel, tags }) => (
                <div key={groupLabel}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{groupLabel}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
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
              ))}
              <p className={cn('text-xs font-medium', tagsComplete ? 'text-success' : 'text-text-muted')}>
                <span className="font-bold">{data.tags.length}</span> / 1 minimum selected
              </p>
            </div>
          </section>

          {/* Section 3: Written review */}
          <section>
            <SectionHeader num={3} done={textComplete} title="Tell the story" desc="What made this memorable? Would you order it again?" />
            <div className="mt-5 overflow-hidden rounded-2xl border-2 border-border transition-colors focus-within:border-primary">
              <textarea
                value={data.text}
                onChange={(e) => updateField('text', e.target.value)}
                rows={5}
                placeholder="The biryani had perfectly layered rice with tender chicken pieces. The flavour was rich and the spice level was just right..."
                className="w-full resize-none border-none bg-bg-cream px-5 py-4 text-base outline-none placeholder:text-text-muted"
              />
              <div className="flex items-center justify-between bg-bg-cream px-5 pb-3">
                <span className={cn('text-xs font-semibold', textComplete ? 'text-success' : 'text-text-muted')}>
                  {data.text.length} / {REVIEW_TEXT_MIN_CHARS} minimum
                </span>
                {data.text.length > 0 && data.text.length < REVIEW_TEXT_MIN_CHARS && (
                  <span className="text-xs font-medium text-brand-gold">
                    {REVIEW_TEXT_MIN_CHARS - data.text.length} more to go
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Optional dish photo */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="text-3xl">📸</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-heading">Got a photo of the dish?</p>
              <p className="text-xs text-text-muted">Optional — but photos make reviews way more helpful</p>
              {photoError && <p className="mt-1 text-xs font-medium text-destructive">{photoError}</p>}
            </div>
            {data.photoPreviewUrl ? (
              <div className="flex items-center gap-2">
                <Image src={data.photoPreviewUrl} alt="Preview" width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => { updateField('photoFile', null); updateField('photoPreviewUrl', null) }}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="shrink-0 rounded-pill border-[1.5px] border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                Add Photo
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Verify your visit */}
          <div className="rounded-2xl border-[1.5px] border-brand-gold/30 bg-gradient-to-br from-brand-gold-light/50 to-brand-gold-light/20 p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card text-2xl shadow-sm">🧾</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-heading">Verify your visit</h3>
                  <span className="inline-flex items-center gap-1 rounded-pill bg-success px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                    Verified
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Upload your bill or receipt and your review gets a <strong className="text-heading">Verified</strong> badge. Verified reviews rank higher and earn more trust.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {data.billPreviewUrl ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-pill border border-success bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                    Bill uploaded
                  </div>
                  <button
                    type="button"
                    onClick={() => { updateField('billFile', null); updateField('billPreviewUrl', null) }}
                    className="text-xs font-semibold text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => billRef.current?.click()}
                  className="flex items-center gap-2 rounded-pill border-2 border-dashed border-brand-gold/40 bg-card px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:border-brand-gold hover:bg-brand-gold-light/30"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                  Upload Bill / Receipt
                </button>
              )}
              <span className="text-xs italic text-text-muted">100% optional</span>
            </div>
            {billError && <p className="mt-2 text-xs font-medium text-destructive">{billError}</p>}
            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-brand-gold"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Your bill is only used for verification — never shown publicly
            </div>
            <input ref={billRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleBillChange} />
          </div>

          {/* Submit bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-sm text-text-muted">
              {canSubmit ? (
                <><strong className="text-success">Ready to go!</strong> Your review looks great.</>
              ) : (
                'Complete all required fields to submit'
              )}
            </p>
            {submitError && <p className="w-full text-xs font-medium text-destructive">{submitError}</p>}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="h-auto rounded-pill px-8 py-3.5 text-base font-semibold hover:bg-primary-dark hover:shadow-glow"
            >
              {submitting ? (
                <LoadingSpinner size="md" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  {isEditMode ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar (desktop only) */}
        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-24 space-y-4">

            {/* Progress card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-base font-bold text-heading">Your progress</h3>
              <div className="mt-4 flex items-center gap-5">
                <ProgressRing percent={progressPercent} />
                <p className="text-sm text-text-secondary">
                  {completedCount === 3 ? (
                    <strong className="text-heading">All done!</strong>
                  ) : (
                    <><strong className="text-heading">{3 - completedCount} section{3 - completedCount > 1 ? 's' : ''}</strong> remaining</>
                  )}
                </p>
              </div>
              <div className="mt-5 space-y-3">
                <CheckItem done={ratingsComplete} label="Rate all 3 categories" />
                <CheckItem done={tagsComplete} label="Pick at least 1 tag" />
                <CheckItem done={textComplete} label={`Write ${REVIEW_TEXT_MIN_CHARS}+ characters`} />
              </div>
            </div>

            {/* Live preview card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-base font-bold text-heading">Live preview</h3>
              <LivePreview data={data} hasBill={!!data.billFile} />
            </div>

          </div>
        </aside>
      </div>

      {/* Sticky mobile progress + submit bar */}
      <div className="fixed bottom-[70px] left-0 right-0 z-40 border-t border-border bg-card/96 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            {[ratingsComplete, tagsComplete, textComplete].map((done, i) => (
              <div
                key={i}
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors duration-300',
                  done ? 'bg-success' : 'border-2 border-border',
                )}
              />
            ))}
          </div>
          <span className="flex-1 text-xs font-semibold text-text-secondary">
            {completedCount === 3 ? 'Ready!' : `${completedCount} of 3 done`}
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-auto rounded-pill px-5 py-2 text-sm font-semibold hover:bg-primary-dark"
          >
            {submitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                {isEditMode ? 'Update' : 'Submit'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ num, done, title, desc }: { num: number; done: boolean; title: string; desc: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white transition-colors duration-300',
          done ? 'bg-success' : 'bg-heading',
        )}>
          {done ? '✓' : num}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          {num === 1 ? 'Rate' : num === 2 ? 'Tag' : 'Write'}
        </span>
      </div>
      <h2 className="font-display text-xl font-bold text-heading sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{desc}</p>
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 30
  const offset = circumference - (circumference * percent) / 100
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r="30" fill="none" strokeWidth="6" className="stroke-border" />
        <circle
          cx="36" cy="36" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-heading">
        {percent}%
      </span>
    </div>
  )
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300',
        done ? 'border-success bg-success text-white' : 'border-border text-transparent',
      )}>
        ✓
      </div>
      <span className={cn(
        'text-sm transition-colors',
        done ? 'text-text-secondary line-through opacity-60' : 'text-text-primary',
      )}>
        {label}
      </span>
    </div>
  )
}

function LivePreview({ data, hasBill }: { data: ReviewFormData; hasBill: boolean }) {
  const hasAnything = !!(data.tasteRating || data.portionRating || data.valueRating || data.tags.length > 0 || data.text)

  if (!hasAnything) {
    return <p className="mt-4 text-center text-sm text-text-muted">Your review will appear here as you fill it in...</p>
  }

  const rated = [data.tasteRating ?? 0, data.portionRating ?? 0, data.valueRating ?? 0].filter((v) => v > 0)
  const overall = rated.length ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : 0

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-1 text-lg">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < overall ? 'text-brand-gold' : 'text-border'}>★</span>
        ))}
      </div>
      <div className="flex gap-3 text-xs text-text-muted">
        {(['tasteRating', 'portionRating', 'valueRating'] as const).map((key, i) => {
          const v = data[key] ?? 0
          return (
            <span key={key} className={v > 0 ? 'font-semibold text-text-primary' : ''}>
              {SUB_RATING_LABELS[i]}: {v > 0 ? `${v}.0` : '—'}
            </span>
          )
        })}
      </div>
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((t) => (
            <span key={t} className="rounded-pill bg-bg-cream px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">{t}</span>
          ))}
        </div>
      )}
      {data.text && (
        <p className="text-sm italic text-text-secondary">
          &ldquo;{data.text.length > 120 ? data.text.substring(0, 120) + '...' : data.text}&rdquo;
        </p>
      )}
      {hasBill && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-success">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
          Verified Purchase
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
