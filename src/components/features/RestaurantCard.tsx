import Link from 'next/link'
import Image from 'next/image'
import type { Restaurant } from '@/lib/types'

interface RestaurantCardProps {
  restaurant: Restaurant
  index?: number
}

export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-transparent hover:shadow-lg active:translate-y-0 active:shadow-md animate-pop-in"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="relative h-32 w-full overflow-hidden bg-bg-cream">
        {restaurant.coverImage ? (
          <Image
            src={restaurant.coverImage}
            alt={restaurant.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🏪</div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="font-display font-semibold text-bg-dark line-clamp-1">{restaurant.name}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{restaurant.area}, {restaurant.city}</p>
        {restaurant.cuisines.length > 0 && (
          <p className="mt-1.5 text-xs text-text-secondary line-clamp-1">{restaurant.cuisines.join(' · ')}</p>
        )}
      </div>
    </Link>
  )
}
