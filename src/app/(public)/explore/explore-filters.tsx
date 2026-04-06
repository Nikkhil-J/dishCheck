'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useRef, useState, useLayoutEffect, Suspense, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { DietaryType, PriceRange } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

type SortOption = 'highest-rated' | 'newest' | 'most-helpful'

interface ExploreFiltersProps {
  query: string
  selectedCuisine: string | null
  selectedArea: string | null
  selectedDietary: DietaryType | null
  selectedPriceRange: PriceRange | null
  selectedSortBy: SortOption
  cuisines: string[]
  areas: string[]
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'highest-rated', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'most-helpful', label: 'Most Reviewed' },
]

const DIETARY_OPTIONS: { value: DietaryType; label: string; dotClass: string }[] = [
  { value: 'veg', label: 'Veg', dotClass: 'bg-success' },
  { value: 'non-veg', label: 'Non-veg', dotClass: 'bg-destructive' },
  { value: 'egg', label: 'Egg', dotClass: 'bg-accent' },
]

const PRICE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'under-100', label: '< ₹100' },
  { value: '100-200', label: '₹100–200' },
  { value: '200-400', label: '₹200–400' },
  { value: '400-600', label: '₹400–600' },
  { value: 'above-600', label: '> ₹600' },
]

const scrollRowClass =
  '-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <div className={scrollRowClass}>
        <div className="flex w-max gap-2 px-1">{children}</div>
      </div>
    </div>
  )
}

function FilterChip({ group, active, onClick, children, className }: {
  group: string
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative shrink-0 rounded-pill px-3.5 py-1 text-[0.8rem] font-medium transition-colors duration-200',
        active
          ? 'text-white'
          : 'border border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {active && (
        <motion.span
          layoutId={`chip-bg-${group}`}
          className="absolute inset-0 rounded-pill bg-primary"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

function SortSegmented({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (v: SortOption) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<SortOption, HTMLButtonElement>>(new Map())
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  function measure(active: SortOption) {
    const container = containerRef.current
    const el = itemRefs.current.get(active)
    if (!container || !el) return
    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    setPill({ left: eRect.left - cRect.left, width: eRect.width })
  }

  useLayoutEffect(() => {
    measure(value)
  }, [value])

  return (
    <div
      ref={containerRef}
      className="relative hidden items-center gap-1 rounded-pill bg-muted/80 p-1 md:flex"
    >
      {pill && (
        <motion.div
          className="absolute top-1 bottom-1 rounded-pill bg-primary shadow-sm"
          animate={{ left: pill.left, width: pill.width }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
      )}
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => { if (el) itemRefs.current.set(opt.value, el) }}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative z-[1] rounded-pill px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors duration-200',
            value === opt.value ? 'text-white' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function FiltersInner({
  selectedCuisine: serverCuisine,
  selectedArea: serverArea,
  selectedDietary: serverDietary,
  selectedPriceRange: serverPriceRange,
  selectedSortBy: serverSortBy,
  cuisines,
  areas,
}: ExploreFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [optimisticCuisine, setOptimisticCuisine] = useState<string | null>(null)
  const [optimisticArea, setOptimisticArea] = useState<string | null>(null)
  const [optimisticDietary, setOptimisticDietary] = useState<DietaryType | null>(null)
  const [optimisticPriceRange, setOptimisticPriceRange] = useState<PriceRange | null>(null)
  const [optimisticSort, setOptimisticSort] = useState<SortOption | null>(null)

  const selectedCuisine = optimisticCuisine ?? serverCuisine
  const selectedArea = optimisticArea ?? serverArea
  const selectedDietary = optimisticDietary ?? serverDietary
  const selectedPriceRange = optimisticPriceRange ?? serverPriceRange
  const selectedSortBy = optimisticSort ?? serverSortBy

  const [lastServerKey, setLastServerKey] = useState(
    `${serverCuisine}-${serverArea}-${serverDietary}-${serverPriceRange}-${serverSortBy}`
  )
  const currentServerKey =
    `${serverCuisine}-${serverArea}-${serverDietary}-${serverPriceRange}-${serverSortBy}`
  if (currentServerKey !== lastServerKey) {
    setLastServerKey(currentServerKey)
    setOptimisticCuisine(null)
    setOptimisticArea(null)
    setOptimisticDietary(null)
    setOptimisticPriceRange(null)
    setOptimisticSort(null)
  }

  const buildUrl = useCallback((overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([key, val]) => {
      if (val) params.set(key, val)
      else params.delete(key)
    })
    return `/explore?${params.toString()}`
  }, [searchParams])

  function signalFilterChange() {
    window.dispatchEvent(new CustomEvent('explore-filter-change'))
  }

  function toggleFilter(key: string, value: string | null) {
    const current = searchParams.get(key)
    const newVal = current === value ? null : value

    if (key === 'cuisine') setOptimisticCuisine(newVal)
    else if (key === 'area') setOptimisticArea(newVal)
    else if (key === 'dietary') setOptimisticDietary(newVal as DietaryType | null)
    else if (key === 'priceRange') setOptimisticPriceRange(newVal as PriceRange | null)

    signalFilterChange()
    router.push(buildUrl({ [key]: newVal }))
  }

  function handleSort(value: SortOption) {
    setOptimisticSort(value)
    signalFilterChange()
    router.push(buildUrl({ sortBy: value === 'highest-rated' ? null : value }))
  }

  const filterCount = [
    selectedCuisine,
    selectedArea,
    selectedDietary,
    selectedPriceRange,
  ].filter(Boolean).length

  const cuisineChips = cuisines.map((c) => (
    <FilterChip key={c} group="cuisine" active={selectedCuisine === c} onClick={() => toggleFilter('cuisine', c)}>
      {c}
    </FilterChip>
  ))

  const dietaryChips = DIETARY_OPTIONS.map((opt) => (
    <FilterChip
      key={opt.value}
      group="dietary"
      active={selectedDietary === opt.value}
      onClick={() => toggleFilter('dietary', opt.value)}
      className="gap-2"
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', opt.dotClass)} aria-hidden />
      {opt.label}
    </FilterChip>
  ))

  const priceChips = PRICE_OPTIONS.map((opt) => (
    <FilterChip key={opt.value} group="price" active={selectedPriceRange === opt.value} onClick={() => toggleFilter('priceRange', opt.value)}>
      {opt.label}
    </FilterChip>
  ))

  const [showAllAreas, setShowAllAreas] = useState(false)
  const visibleAreas = showAllAreas ? areas : areas.slice(0, 6)

  const areaChips = (
    <>
      {visibleAreas.map((a) => (
        <FilterChip key={a} group="area" active={selectedArea === a} onClick={() => toggleFilter('area', a)}>
          {a}
        </FilterChip>
      ))}
      {areas.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAllAreas((prev) => !prev)}
          className="shrink-0 text-xs font-medium text-primary hover:underline ml-1"
        >
          {showAllAreas ? 'Show less' : `+${areas.length - 6} more`}
        </button>
      )}
    </>
  )

  const filterGroups = (
    <div className="space-y-5">
      <FilterSection label="Cuisine">{cuisineChips}</FilterSection>
      <FilterSection label="Diet">{dietaryChips}</FilterSection>
      <FilterSection label="Price">{priceChips}</FilterSection>
      {areas.length > 0 && <FilterSection label="Area">{areaChips}</FilterSection>}
    </div>
  )

  const sortSelectMobile = (
    <div className="flex w-full items-center gap-3 md:hidden">
      <span className="shrink-0 text-xs font-medium text-text-muted">Sort</span>
      <Select
        value={selectedSortBy}
        onValueChange={(val) => handleSort(val as SortOption)}
      >
        <SelectTrigger className="h-9 min-w-0 flex-1 rounded-xl border-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const summaryRow =
    filterCount > 0 ? (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-muted">
          {filterCount} filter{filterCount !== 1 ? 's' : ''}
        </span>
        {selectedCuisine && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1"
            render={<button type="button" onClick={() => toggleFilter('cuisine', selectedCuisine)} />}
          >
            {selectedCuisine}
            <X className="h-3 w-3 text-text-muted" aria-hidden />
          </Badge>
        )}
        {selectedDietary && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1 capitalize"
            render={<button type="button" onClick={() => toggleFilter('dietary', selectedDietary)} />}
          >
            {selectedDietary === 'non-veg' ? 'Non-veg' : selectedDietary}
            <X className="h-3 w-3 text-text-muted" aria-hidden />
          </Badge>
        )}
        {selectedPriceRange && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1"
            render={<button type="button" onClick={() => toggleFilter('priceRange', selectedPriceRange)} />}
          >
            {PRICE_OPTIONS.find((p) => p.value === selectedPriceRange)?.label ?? selectedPriceRange}
            <X className="h-3 w-3 text-text-muted" aria-hidden />
          </Badge>
        )}
        {selectedArea && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1"
            render={<button type="button" onClick={() => toggleFilter('area', selectedArea)} />}
          >
            {selectedArea}
            <X className="h-3 w-3 text-text-muted" aria-hidden />
          </Badge>
        )}
        <Button
          variant="link"
          size="xs"
          onClick={() => {
            signalFilterChange()
            router.push(buildUrl({ cuisine: null, dietary: null, priceRange: null, area: null }))
          }}
          className="text-xs font-semibold"
        >
          Clear all
        </Button>
      </div>
    ) : null

  return (
    <div>
      {/* Mobile: filters sheet trigger */}
      <div className="flex gap-2 md:hidden">
        <Sheet>
          <SheetTrigger
            className={cn(
              'relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-pill border-2 border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-text-primary',
              'transition-colors hover:border-primary hover:text-primary'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="max-[380px]:sr-only">Filters</span>
            {filterCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px] font-bold">
                {filterCount > 9 ? '9+' : filterCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle className="font-display text-lg font-bold text-bg-dark">Filters</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{filterGroups}</div>
          </SheetContent>
        </Sheet>
      </div>

      {summaryRow}

      {/* Desktop filter groups */}
      <div className="mt-4 hidden space-y-5 rounded-2xl border border-border bg-surface/80 p-5 md:block">
        {filterGroups}
      </div>

      {/* Sort toolbar */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <span className="hidden text-xs font-semibold uppercase tracking-wide text-text-muted md:block">
          Sort by
        </span>
        {sortSelectMobile}
        <SortSegmented value={selectedSortBy} onChange={handleSort} />
      </div>
    </div>
  )
}

export function ExploreFilters(props: ExploreFiltersProps) {
  return (
    <Suspense>
      <FiltersInner {...props} />
    </Suspense>
  )
}
