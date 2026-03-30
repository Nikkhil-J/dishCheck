'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { useReviewFormStore } from '@/lib/store/reviewFormStore'
import { getDish } from '@/lib/firebase/dishes'
import { createReview } from '@/lib/firebase/reviews'
import { uploadDishPhoto } from '@/lib/firebase/cloudinary'
import { validatePhotoFile } from '@/lib/utils/index'
import { getNewlyEarnedBadges } from '@/lib/constants'
import { StarRating } from '@/components/ui/StarRating'
import { TagPill } from '@/components/ui/TagPill'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TAG_LIST } from '@/lib/constants'
import type { Dish } from '@/lib/types'

function WriteReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dishId = searchParams.get('dishId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''

  const { user } = useAuth()
  const { data, currentStep, setStep, updateField, reset } = useReviewFormStore()
  const [dish, setDish] = useState<Dish | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dishId !== data.dishId) {
      updateField('dishId', dishId)
      updateField('restaurantId', restaurantId)
    }
    getDish(dishId).then(setDish)
  }, [dishId, restaurantId]) // eslint-disable-line

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { valid, error } = validatePhotoFile(file)
    if (!valid) { setPhotoError(error); return }
    setPhotoError(null)
    updateField('photoFile', file)
    updateField('photoPreviewUrl', URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!user || !data.photoFile || !data.tasteRating || !data.portionRating || !data.valueRating) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const photoUrl = await uploadDishPhoto(data.photoFile, dishId)
      const prevBadges = user.badges
      await createReview({
        dishId,
        restaurantId,
        photoFile: data.photoFile,
        photoPreviewUrl: photoUrl,
        tasteRating: data.tasteRating,
        portionRating: data.portionRating,
        valueRating: data.valueRating,
        tags: data.tags,
        text: data.text,
      }, user, photoUrl)
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
        prevBadges,
        newReviewCount: user.reviewCount + 1,
      }))
      reset()
      router.push('/review-success')
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = ['Photo', 'Ratings & Tags', 'Review text']

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {/* Header */}
      {dish && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{dish.name}</h1>
          <p className="text-sm text-gray-500">{dish.restaurantName}</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              currentStep === i + 1 ? 'bg-brand text-white' :
              currentStep > i + 1 ? 'bg-brand text-white opacity-60' : 'bg-gray-100 text-gray-400'
            }`}>
              {currentStep > i + 1 ? '✓' : i + 1}
            </div>
            <span className="text-center text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1 — Photo */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-brand hover:bg-brand-light transition-colors"
          >
            {data.photoPreviewUrl ? (
              <Image src={data.photoPreviewUrl} alt="Preview" width={400} height={224} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <p className="mt-2 text-sm text-gray-500">Click to upload a photo</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          {data.photoPreviewUrl && (
            <button onClick={() => { updateField('photoFile', null); updateField('photoPreviewUrl', null) }} className="text-xs text-gray-400 hover:text-red-500">
              Retake photo
            </button>
          )}
          {photoError && <p className="text-xs text-red-600">{photoError}</p>}
          <p className="text-xs text-gray-400">Photo required to submit a review.</p>
          <button
            onClick={() => setStep(2)}
            disabled={!data.photoFile}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Next: Ratings & Tags
          </button>
        </div>
      )}

      {/* Step 2 — Ratings + Tags */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {[
            { label: 'Taste', field: 'tasteRating' as const },
            { label: 'Portion', field: 'portionRating' as const },
            { label: 'Value', field: 'valueRating' as const },
          ].map(({ label, field }) => (
            <div key={label}>
              <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
              <StarRating
                value={data[field] ?? 0}
                onChange={(v) => updateField(field, v)}
                size="lg"
              />
            </div>
          ))}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tags (select at least 1)</label>
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
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!data.tasteRating || !data.portionRating || !data.valueRating || data.tags.length === 0}
              className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Next: Review text
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Text + Submit */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Review <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={data.text}
              onChange={(e) => updateField('text', e.target.value)}
              rows={5}
              placeholder="Tell others what made this dish memorable…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{data.text.length} chars</p>
            {data.text.length > 0 && data.text.length < 30 && (
              <p className="text-xs text-amber-600">Min 30 characters if writing a review</p>
            )}
          </div>
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (data.text.length > 0 && data.text.length < 30)}
              className="flex flex-1 items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? <LoadingSpinner size="sm" /> : 'Submit Review'}
            </button>
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
