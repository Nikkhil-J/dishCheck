'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDishComparison, searchDishes } from '@/lib/services/dishes'
import { formatRating } from '@/lib/utils/index'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Dish } from '@/lib/types'

interface DishPickerProps {
  slot: 1 | 2
  query: string
  setQuery: (v: string) => void
  results: Dish[]
  selected: Dish | null
  onSelect: (d: Dish | null) => void
  onSearch: (q: string) => void
  onClearResults: () => void
}

function DishPicker({ slot, query, setQuery, results, selected, onSelect, onSearch, onClearResults }: DishPickerProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearch(value), 300)
  }

  return (
    <div className="flex-1">
      <Label className="mb-1 text-xs font-medium text-text-secondary">Dish {slot}</Label>
      {selected ? (
        <div className="rounded-xl border border-primary bg-primary-light p-3">
          <p className="text-sm font-medium text-bg-dark">{selected.name}</p>
          <p className="text-xs text-text-muted">{selected.restaurantName}</p>
          <Button
            variant="ghost"
            onClick={() => onSelect(null)}
            className="mt-1 h-auto p-0 text-xs text-destructive hover:bg-transparent hover:underline"
          >
            Clear
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={handleInputChange}
            placeholder="Search dish…"
            className="h-auto border border-border px-3 py-2 text-sm focus-visible:border-primary"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg">
              {results.slice(0, 5).map((d) => (
                <Button
                  key={d.id}
                  variant="ghost"
                  onClick={() => { onSelect(d); setQuery(d.name); onClearResults() }}
                  className="w-full h-auto justify-start rounded-none px-3 py-2 text-left text-sm hover:bg-bg-cream"
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-2 text-xs text-text-muted">{d.restaurantName}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComparePage() {
  const { user } = useAuth()
  const [query1, setQuery1] = useState('')
  const [query2, setQuery2] = useState('')
  const [results1, setResults1] = useState<Dish[]>([])
  const [results2, setResults2] = useState<Dish[]>([])
  const [dish1, setDish1] = useState<Dish | null>(null)
  const [dish2, setDish2] = useState<Dish | null>(null)
  const [loading, setLoading] = useState(false)

  if (!user?.isPremium) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <UpgradePrompt />
      </div>
    )
  }

  async function search(q: string, slot: 1 | 2) {
    if (q.length < 2) {
      if (slot === 1) { setResults1([]) } else { setResults2([]) }
      return
    }
    const result = await searchDishes(q)
    if (slot === 1) { setResults1(result.items) } else { setResults2(result.items) }
  }

  async function compare() {
    if (!dish1 || !dish2) return
    setLoading(true)
    const pair = await getDishComparison(dish1.id, dish2.id)
    setLoading(false)
    if (pair) { setDish1(pair[0]); setDish2(pair[1]) }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-bg-dark">Compare dishes</h1>
      <p className="mt-1 text-sm text-text-secondary">Pick two dishes to see them side-by-side</p>

      <div className="mt-6 flex gap-4">
        <DishPicker
          slot={1}
          query={query1}
          setQuery={setQuery1}
          results={results1}
          selected={dish1}
          onSelect={setDish1}
          onSearch={(q) => search(q, 1)}
          onClearResults={() => setResults1([])}
        />
        <div className="flex items-center pt-5 text-text-muted">vs</div>
        <DishPicker
          slot={2}
          query={query2}
          setQuery={setQuery2}
          results={results2}
          selected={dish2}
          onSelect={setDish2}
          onSearch={(q) => search(q, 2)}
          onClearResults={() => setResults2([])}
        />
      </div>

      <Button
        onClick={compare}
        disabled={!dish1 || !dish2 || loading}
        className="mt-4 w-full h-auto py-2.5 text-sm font-medium hover:bg-primary-dark"
      >
        {loading ? <LoadingSpinner size="sm" /> : 'Compare'}
      </Button>

      {dish1 && dish2 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-3 bg-bg-cream">
            <div className="p-4 text-center">
              {dish1.coverImage && <Image src={dish1.coverImage} alt={dish1.name} width={80} height={80} className="mx-auto rounded-lg object-cover" />}
              <p className="mt-2 text-sm font-semibold text-bg-dark">{dish1.name}</p>
              <p className="text-xs text-text-muted">{dish1.restaurantName}</p>
            </div>
            <div className="flex items-center justify-center p-4">
              <span className="text-xs font-medium text-text-muted">vs</span>
            </div>
            <div className="p-4 text-center">
              {dish2.coverImage && <Image src={dish2.coverImage} alt={dish2.name} width={80} height={80} className="mx-auto rounded-lg object-cover" />}
              <p className="mt-2 text-sm font-semibold text-bg-dark">{dish2.name}</p>
              <p className="text-xs text-text-muted">{dish2.restaurantName}</p>
            </div>
          </div>

          {[
            { label: 'Overall', v1: dish1.avgOverall, v2: dish2.avgOverall },
            { label: 'Taste', v1: dish1.avgTaste, v2: dish2.avgTaste },
            { label: 'Portion', v1: dish1.avgPortion, v2: dish2.avgPortion },
            { label: 'Value', v1: dish1.avgValue, v2: dish2.avgValue },
          ].map(({ label, v1, v2 }) => (
            <div key={label} className="grid grid-cols-3 border-t border-border px-4 py-3">
              <div className={`text-sm font-semibold ${v1 > v2 ? 'text-primary' : 'text-text-primary'}`}>{formatRating(v1)}</div>
              <div className="self-center text-center text-xs text-text-muted">{label}</div>
              <div className={`text-right text-sm font-semibold ${v2 > v1 ? 'text-primary' : 'text-text-primary'}`}>{formatRating(v2)}</div>
            </div>
          ))}

          <div className="grid grid-cols-3 border-t border-border px-4 py-3">
            <div className="text-sm text-text-secondary">{dish1.reviewCount} reviews</div>
            <div className="self-center text-center text-xs text-text-muted">Reviews</div>
            <div className="text-right text-sm text-text-secondary">{dish2.reviewCount} reviews</div>
          </div>
        </div>
      )}
    </div>
  )
}
