'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { getWishlist, removeFromWishlist } from '@/lib/firebase/wishlist'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRating } from '@/lib/utils/index'

export default function WishlistPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { items, setAll, removeId } = useWishlistStore()

  useEffect(() => {
    if (!user) return
    getWishlist(user.id).then(setAll)
  }, [user]) // eslint-disable-line

  async function handleRemove(dishId: string) {
    if (!user) return
    removeId(dishId)
    await removeFromWishlist(user.id, dishId)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
      <p className="mt-1 text-sm text-gray-500">Dishes you want to try</p>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="🔖"
            title="Your wishlist is empty"
            description="Save dishes you want to try and find them here."
            ctaLabel="Browse dishes"
            onCta={() => router.push('/browse')}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={item.dishId} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              {item.coverImage ? (
                <Image src={item.coverImage} alt={item.dishName} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/dish/${item.dishId}`} className="font-medium text-gray-900 hover:text-brand line-clamp-1">
                  {item.dishName}
                </Link>
                <p className="text-xs text-gray-500">{item.restaurantName}</p>
                <p className="text-xs text-brand font-medium">★ {formatRating(item.avgOverall)}</p>
              </div>
              <button
                onClick={() => handleRemove(item.dishId)}
                className="text-xs text-gray-400 hover:text-red-500 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
