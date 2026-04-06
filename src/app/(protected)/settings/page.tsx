'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/lib/hooks/useAuth'
import { updateUser } from '@/lib/services/users'
import { uploadAvatarPhoto } from '@/lib/services/cloudinary'
import { useAuthStore } from '@/lib/store/authStore'
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
import { UserAvatar } from '@/components/ui/Avatar'
import { CITY_AREAS, SUPPORTED_CITIES, type City } from '@/lib/constants'
import { useCityContext } from '@/lib/context/CityContext'

export default function SettingsPage() {
  const { user } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const authUser = useAuthStore((s) => s.authUser)
  const router = useRouter()
  const { setCity: setCityContext } = useCityContext()
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  if (!user) return null

  const firebaseUser = auth.currentUser
  const isPasswordUser = firebaseUser?.providerData?.[0]?.providerId === 'password'

  const areas: readonly string[] = city && (SUPPORTED_CITIES as readonly string[]).includes(city)
    ? CITY_AREAS[city as City] ?? []
    : []

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    const nextDisplayName = displayName.trim() || user.displayName
    const nextCity = city || user.city
    const updates: Parameters<typeof updateUser>[1] = { displayName: nextDisplayName }
    if (nextCity) updates.city = nextCity
    if (area) updates.area = area
    if (avatarFile) {
      const result = await uploadAvatarPhoto(avatarFile, user.id)
      if (result?.secure_url) {
        updates.avatarUrl = result.secure_url
      }
    }
    const ok = await updateUser(user.id, updates)
    setSaving(false)
    if (!ok) {
      setError('Failed to save. Please try again.')
      toast.error('Could not save profile')
      return
    }
    setUser({ ...user, displayName: nextDisplayName, city: nextCity }, authUser)
    if (nextCity && (SUPPORTED_CITIES as readonly string[]).includes(nextCity)) {
      setCityContext(nextCity as City)
    }
    setSaved(true)
    toast.success('Profile updated')
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-bg-dark">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">Update your profile information</p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="displayName" className="mb-1.5 text-sm font-semibold text-text-primary">Display name</Label>
          <Input
            id="displayName"
            type="text"
            required
            value={displayName || user.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary"
          />
        </div>

        <div>
          <Label htmlFor="email" className="mb-1.5 text-sm font-semibold text-text-primary">Email</Label>
          <Input
            id="email"
            type="email"
            disabled
            value={user.email}
            className="h-auto border border-border bg-border/30 px-3 py-2.5 text-sm text-text-muted"
          />
        </div>

        <div>
          <Label className="mb-1.5 text-sm font-semibold text-text-primary">City</Label>
          <Select
            value={city || user.city || ''}
            onValueChange={(val) => { setCity(val as string); setArea('') }}
          >
            <SelectTrigger className="w-full rounded-lg border-2 border-border bg-bg-cream px-3 py-2.5 text-sm">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {areas.length > 0 && (
          <div>
            <Label className="mb-1.5 text-sm font-semibold text-text-primary">Area (optional)</Label>
            <Select value={area} onValueChange={(val) => setArea(val as string)}>
              <SelectTrigger className="w-full rounded-lg border-2 border-border bg-bg-cream px-3 py-2.5 text-sm">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {(CITY_AREAS[city as City] ?? []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        {saved && <p className="text-xs font-medium text-success">Profile saved!</p>}

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-auto py-2.5 text-sm font-semibold hover:bg-primary-dark"
        >
          {saving ? <LoadingSpinner size="sm" /> : 'Save changes'}
        </Button>
      </form>

      {/* Avatar upload */}
      <section className="mt-6 border-t border-border pt-6">
        <h3 className="mb-4 text-base font-semibold text-bg-dark">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div
            className="relative cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            <UserAvatar src={avatarPreview ?? user.avatarUrl} name={user.displayName} size="lg" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Camera size={16} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-text-primary">
              {avatarFile ? avatarFile.name : 'Click avatar to change'}
            </p>
            <p className="text-xs text-text-muted">Saved with profile changes above</p>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setAvatarFile(file)
              setAvatarPreview(URL.createObjectURL(file))
            }
          }}
        />
      </section>

      {/* Password change (email users only) */}
      {isPasswordUser && (
        <section className="mt-6 border-t border-border pt-6">
          <h3 className="mb-4 text-base font-semibold text-bg-dark">Change Password</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!firebaseUser?.email) return
              setPasswordLoading(true)
              try {
                const credential = EmailAuthProvider.credential(
                  firebaseUser.email,
                  currentPassword
                )
                await reauthenticateWithCredential(firebaseUser, credential)
                await updatePassword(firebaseUser, newPassword)
                toast.success('Password updated successfully')
                setCurrentPassword('')
                setNewPassword('')
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to update password')
              } finally {
                setPasswordLoading(false)
              }
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="currentPassword" className="mb-1.5 text-sm font-semibold text-text-primary">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="mb-1.5 text-sm font-semibold text-text-primary">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="h-auto border-2 border-border bg-bg-cream px-3 py-2.5 text-sm placeholder:text-text-muted focus-visible:border-primary"
              />
            </div>
            <Button type="submit" disabled={passwordLoading} className="h-auto py-2.5 text-sm font-semibold hover:bg-primary-dark">
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </section>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-text-primary">Account</h2>
        <p className="mt-1 text-xs text-text-muted">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
        <p className="mt-0.5 text-xs text-text-muted">Level: {user.level} · Reviews: {user.reviewCount}</p>
      </div>
    </div>
  )
}
