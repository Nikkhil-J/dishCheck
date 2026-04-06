import Link from 'next/link'
import Image from 'next/image'
import type { Dish } from '@/lib/types'
import { formatRating } from '@/lib/utils/index'
import { cn } from '@/lib/utils'
import { getCuisineEmoji, getCuisineGradient } from '@/lib/utils/dish-display'
import { PRICE_LABEL, DIETARY_ICON } from '@/lib/constants'

interface DishCardProps {
  dish: Dish
  index?: number
}

export function DishCard({ dish, index = 0 }: DishCardProps) {
  return (
    <Link
      href={`/dish/${dish.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-transparent hover:shadow-lg active:translate-y-0 active:shadow-md animate-pop-in"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="relative h-36 w-full overflow-hidden bg-bg-cream">
        {dish.coverImage ? (
          <Image
            src={dish.coverImage}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div className={cn("absolute inset-0", getCuisineGradient(dish.cuisines?.[0]))} />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                  radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
                backgroundSize: '30px 30px',
              }}
            />
            <div className="relative flex flex-col items-center gap-2">
              <span className="text-5xl drop-shadow-sm">
                {getCuisineEmoji(dish.cuisines?.[0])}
              </span>
            </div>
          </div>
        )}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-sm bg-success px-2 py-0.5 text-xs font-bold text-white">
          ★ {formatRating(dish.avgOverall)}
        </div>
        {dish.dietary && (
          <div className="absolute left-2.5 top-2.5 rounded-sm bg-card/90 px-1.5 py-0.5 text-xs font-medium shadow-sm backdrop-blur-sm">
            {DIETARY_ICON[dish.dietary] ?? dish.dietary}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="font-display font-semibold text-bg-dark line-clamp-1">{dish.name}</h3>
        <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{dish.restaurantName}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-text-muted">{dish.reviewCount} reviews</span>
          {dish.priceRange && (
            <span className="text-sm font-bold text-bg-dark">{PRICE_LABEL[dish.priceRange]}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
