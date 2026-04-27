'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { DishCard } from '@/components/features/DishCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Dish } from '@/lib/types'

const INITIAL_VISIBLE = 6

interface RestaurantMenuProps {
  dishes: Dish[]
}

export function RestaurantMenu({ dishes }: RestaurantMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const isSearching = searchQuery.trim().length > 0

  const filteredDishes = useMemo(() => {
    if (!isSearching) return dishes
    const q = searchQuery.toLowerCase().trim()
    return dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.topTags.some((t) => t.toLowerCase().includes(q))
    )
  }, [dishes, searchQuery, isSearching])

  const shouldTruncate = !isSearching && !showAll && filteredDishes.length > INITIAL_VISIBLE
  const visibleDishes = shouldTruncate
    ? filteredDishes.slice(0, INITIAL_VISIBLE)
    : filteredDishes
  const hiddenCount = filteredDishes.length - INITIAL_VISIBLE

  return (
    <div>
      {/* Search within menu */}
      {dishes.length > 3 && (
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value.trim()) setShowAll(true)
            }}
            placeholder="Search this menu..."
            className={cn(
              'h-auto w-full rounded-pill border border-border bg-card/50 py-2.5 pl-10 pr-4 text-sm font-body',
              'placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0'
            )}
          />
        </div>
      )}

      {/* Results */}
      {visibleDishes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-10 text-center">
          <p className="text-2xl">🍽️</p>
          <p className="mt-2 font-display font-semibold text-heading">
            No dishes match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="mt-1 text-sm text-text-muted">Try a different search term.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {visibleDishes.map((dish, i) => (
            <DishCard key={dish.id} dish={dish} index={i} />
          ))}
        </div>
      )}

      {/* View full menu toggle */}
      {!isSearching && filteredDishes.length > INITIAL_VISIBLE && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll((prev) => !prev)}
            className="h-auto gap-2 rounded-pill border-2 border-border px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-primary hover:bg-transparent hover:text-primary"
          >
            {showAll ? (
              <>Show less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>View full menu ({hiddenCount} more) <ChevronDown className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
