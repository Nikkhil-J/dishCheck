'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { formatRating } from '@/lib/utils/index'

export default function WishlistPage() {
  const { user, authUser } = useAuth()
  const queryClient = useQueryClient()
  const { data: items = [], isLoading: loading } = useWishlist()

  async function handleRemove(dishId: string) {
    if (!user || !authUser) return
    const token = await authUser.getIdToken()
    const res = await fetch(
      `/api/users/${encodeURIComponent(user.id)}/wishlist/${encodeURIComponent(dishId)}`,
      { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }
    )
    await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    if (!res.ok) {
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-bg-dark">Your Wishlist</h1>
        <p className="mt-1 text-sm text-text-secondary">Dishes you want to try next</p>
        {items.length > 0 && (
          <p className="mt-2 text-xs text-text-muted">{items.length} dishes saved</p>
        )}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center"><LoadingSpinner /></div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="💭"
            title="No dishes saved yet"
            description="Browse dishes and tap the heart icon to save them here for later."
            ctaLabel="Explore Dishes"
            ctaHref="/explore"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.dishId} className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md">
              <div className="relative h-36 bg-bg-cream">
                {item.coverImage ? (
                  <Image src={item.coverImage} alt={item.dishName} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.dishId)}
                  className="absolute right-2.5 top-2.5 size-8 rounded-full bg-card/90 text-primary backdrop-blur-sm hover:bg-primary hover:text-white"
                >
                  <Heart className="h-3.5 w-3.5" fill="currentColor" />
                </Button>
              </div>
              <div className="p-3.5">
                <Link href={`/dish/${item.dishId}`} className="font-display font-semibold text-bg-dark line-clamp-1 hover:text-primary">
                  {item.dishName}
                </Link>
                <p className="mt-0.5 text-xs text-text-muted">{item.restaurantName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-bold text-success">★ {formatRating(item.avgOverall)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
