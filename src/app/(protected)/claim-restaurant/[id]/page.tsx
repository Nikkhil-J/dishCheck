'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { getRestaurantDetails } from '@/lib/services/catalog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Restaurant, ClaimantRole } from '@/lib/types'
import { ROUTES } from '@/lib/constants/routes'
import { API_ENDPOINTS } from '@/lib/constants/api'
import { CLIENT_ERRORS } from '@/lib/constants/errors'
import { HTTP_HEADERS } from '@/lib/constants'
import { MobileBackButton } from '@/components/ui/MobileBackButton'

export default function ClaimRestaurantPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, authUser } = useAuth()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<ClaimantRole>('owner')
  const [proofUrl, setProofUrl] = useState('')

  useEffect(() => {
    if (!params.id) return
    getRestaurantDetails(params.id)
      .then((r) => { setRestaurant(r); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !authUser || !restaurant) return

    setSubmitting(true)
    setError(null)

    const token = await authUser.getIdToken()
    const res = await fetch(API_ENDPOINTS.restaurantClaim(encodeURIComponent(restaurant.id)), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.CONTENT_TYPE_JSON,
      },
      body: JSON.stringify({
        phone,
        role,
        proofDocumentUrl: proofUrl.trim() || null,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.message ?? CLIENT_ERRORS.SOMETHING_WENT_WRONG_RETRY)
      return
    }

    setSubmitted(true)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-lg font-semibold text-heading">Restaurant not found</p>
        <p className="mt-1 text-sm text-text-muted">The restaurant you are looking for does not exist.</p>
      </div>
    )
  }

  if (restaurant.ownerId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-4xl">✅</p>
        <p className="mt-3 text-lg font-semibold text-heading">Already claimed</p>
        <p className="mt-1 text-sm text-text-muted">This restaurant already has a verified owner.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-4xl">📋</p>
        <p className="mt-3 text-lg font-semibold text-heading">Claim submitted!</p>
        <p className="mt-1 text-sm text-text-secondary">
          We&apos;ll review your claim for <strong>{restaurant.name}</strong> and notify you once it&apos;s approved.
          This usually takes 1–3 business days.
        </p>
        <Button
          onClick={() => router.push(ROUTES.restaurant(restaurant.id))}
          className="mt-6 h-auto px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark"
        >
          Back to restaurant
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <MobileBackButton />
      <h1 className="font-display text-2xl font-bold text-heading">Claim this restaurant</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Verify your ownership of <strong>{restaurant.name}</strong> to access the analytics dashboard.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="font-semibold text-heading">{restaurant.name}</p>
        <p className="text-sm text-text-muted">{restaurant.area}, {restaurant.city}</p>
        <p className="text-xs text-text-muted">{restaurant.address}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <Label className="mb-1.5 text-sm font-semibold text-text-primary">Your phone number</Label>
          <Input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary"
          />
        </div>

        <div>
          <Label className="mb-1.5 text-sm font-semibold text-text-primary">Your role</Label>
          <Select value={role} onValueChange={(val) => setRole(val as ClaimantRole)}>
            <SelectTrigger className="w-full rounded-lg border-2 border-border bg-bg-cream px-3 py-2.5 text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 text-sm font-semibold text-text-primary">
            Proof document URL <span className="font-normal text-text-muted">(optional)</span>
          </Label>
          <Input
            type="url"
            placeholder="https://drive.google.com/..."
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary"
          />
          <p className="mt-1 text-xs text-text-muted">
            Link to a photo of FSSAI license, business registration, or utility bill with the restaurant name.
          </p>
        </div>

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-auto py-2.5 text-sm font-semibold hover:bg-primary-dark"
        >
          {submitting ? <LoadingSpinner size="sm" /> : 'Submit claim'}
        </Button>
      </form>
    </div>
  )
}
