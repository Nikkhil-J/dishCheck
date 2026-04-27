'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { formatRating } from '@/lib/utils/index'
import { ROUTES } from '@/lib/constants/routes'
import type { Dish } from '@/lib/types'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface ReviewDishPickerProps {
  dishes: Dish[]
  restaurantId: string
  restaurantName: string
}

export function ReviewDishPicker({ dishes, restaurantId, restaurantName }: ReviewDishPickerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? dishes.filter((d) => d.name.toLowerCase().includes(query.toLowerCase().trim()))
    : dishes

  function handleSelect(dish: Dish) {
    setOpen(false)
    router.push(
      `${ROUTES.WRITE_REVIEW}?dishId=${dish.id}&restaurantId=${restaurantId}&dishName=${encodeURIComponent(dish.name)}&restaurantName=${encodeURIComponent(restaurantName)}`
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        Review a Dish
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle className="font-display text-lg font-bold text-heading">
            Which dish did you try?
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pt-2 pb-2">
          {dishes.length > 5 && (
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-text-muted" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes..."
                className={cn(
                  'h-auto w-full rounded-pill border border-border bg-card/50 py-2 pl-10 pr-4 text-sm',
                  'placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0'
                )}
                autoFocus
              />
            </div>
          )}

          <div className="max-h-[50dvh] overflow-y-auto -mx-1 px-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">No dishes match your search.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => handleSelect(dish)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-bg-cream">
                      {dish.coverImage ? (
                        <Image
                          src={dish.coverImage}
                          alt={dish.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-heading line-clamp-1">{dish.name}</p>
                      <p className="text-xs text-text-muted">
                        ★ {formatRating(dish.avgOverall)} · {dish.reviewCount} review{dish.reviewCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">Review &rsaquo;</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
