'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { Button } from '@/components/ui/button'

interface WishlistButtonProps {
  dishId: string
  className?: string
}

export function WishlistButton({ dishId, className = '' }: WishlistButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, authUser, isAuthenticated } = useAuth()
  const { savedIds, addId, removeId } = useWishlistStore()
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    setIsSaved(savedIds.has(dishId))
  }, [savedIds, dishId])

  async function handleToggle() {
    if (!user || !isAuthenticated) return
    const token = authUser ? await authUser.getIdToken() : null
    if (!token) return

    if (isSaved) {
      removeId(dishId)
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.id)}/wishlist/${encodeURIComponent(dishId)}`,
        { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        addId(dishId)
        toast.error('Could not update wishlist')
      }
    } else {
      addId(dishId)
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.id)}/wishlist/${encodeURIComponent(dishId)}`,
        { method: 'POST', headers: { authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        removeId(dishId)
        toast.error('Could not update wishlist')
      }
    }
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push('/login?redirect=' + encodeURIComponent(pathname))}
        className={`h-auto gap-2 rounded-pill border-2 px-5 py-3 text-sm font-semibold transition-all hover:bg-transparent border-border text-text-primary hover:border-primary hover:text-primary ${className}`}
        aria-label="Save dish"
      >
        <Heart className="h-4 w-4" />
        Save
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      className={`h-auto gap-2 rounded-pill border-2 px-5 py-3 text-sm font-semibold transition-all hover:bg-transparent ${
        isSaved
          ? 'border-primary bg-primary-light text-primary'
          : 'border-border text-text-primary hover:border-primary hover:text-primary'
      } ${className}`}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  )
}
