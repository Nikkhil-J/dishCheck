'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDishComparison } from '@/lib/firebase/dishes'
import { searchDishes } from '@/lib/firebase/dishes'
import { formatRating } from '@/lib/utils/index'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import type { Dish } from '@/lib/types'

export default function ComparePage() {
  const { user } = useAuth()
  const router = useRouter()
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
        <UpgradePrompt onUpgrade={() => router.push('/upgrade')} />
      </div>
    )
  }

  async function search(q: string, slot: 1 | 2) {
    if (q.length < 2) { slot === 1 ? setResults1([]) : setResults2([]); return }
    const result = await searchDishes(q)
    slot === 1 ? setResults1(result.items) : setResults2(result.items)
  }

  async function compare() {
    if (!dish1 || !dish2) return
    setLoading(true)
    const pair = await getDishComparison(dish1.id, dish2.id)
    setLoading(false)
    if (pair) { setDish1(pair[0]); setDish2(pair[1]) }
  }

  function DishPicker({ slot, query, setQuery, results, selected, onSelect }: {
    slot: 1 | 2; query: string; setQuery: (v: string) => void
    results: Dish[]; selected: Dish | null; onSelect: (d: Dish) => void
  }) {
    return (
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">Dish {slot}</label>
        {selected ? (
          <div className="rounded-xl border border-brand bg-brand-light p-3">
            <p className="font-medium text-gray-900 text-sm">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.restaurantName}</p>
            <button onClick={() => onSelect(null as unknown as Dish)} className="mt-1 text-xs text-red-400 hover:text-red-600">Clear</button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value, slot) }}
              placeholder="Search dish…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
                {results.slice(0, 5).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { onSelect(d); setQuery(d.name); slot === 1 ? setResults1([]) : setResults2([]) }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{d.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{d.restaurantName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Compare dishes</h1>
      <p className="mt-1 text-sm text-gray-500">Pick two dishes to see them side-by-side</p>

      <div className="mt-6 flex gap-4">
        <DishPicker slot={1} query={query1} setQuery={setQuery1} results={results1} selected={dish1} onSelect={setDish1} />
        <div className="flex items-center pt-5 text-gray-400">vs</div>
        <DishPicker slot={2} query={query2} setQuery={setQuery2} results={results2} selected={dish2} onSelect={setDish2} />
      </div>

      <button
        onClick={compare}
        disabled={!dish1 || !dish2 || loading}
        className="mt-4 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : 'Compare'}
      </button>

      {dish1 && dish2 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-gray-50">
            <div className="p-4 text-center">
              {dish1.coverImage && <Image src={dish1.coverImage} alt={dish1.name} width={80} height={80} className="mx-auto rounded-lg object-cover" />}
              <p className="mt-2 font-semibold text-sm text-gray-900">{dish1.name}</p>
              <p className="text-xs text-gray-500">{dish1.restaurantName}</p>
            </div>
            <div className="flex items-center justify-center p-4">
              <span className="text-xs font-medium text-gray-400">vs</span>
            </div>
            <div className="p-4 text-center">
              {dish2.coverImage && <Image src={dish2.coverImage} alt={dish2.name} width={80} height={80} className="mx-auto rounded-lg object-cover" />}
              <p className="mt-2 font-semibold text-sm text-gray-900">{dish2.name}</p>
              <p className="text-xs text-gray-500">{dish2.restaurantName}</p>
            </div>
          </div>

          {/* Ratings */}
          {[
            { label: 'Overall', v1: dish1.avgOverall, v2: dish2.avgOverall },
            { label: 'Taste', v1: dish1.avgTaste, v2: dish2.avgTaste },
            { label: 'Portion', v1: dish1.avgPortion, v2: dish2.avgPortion },
            { label: 'Value', v1: dish1.avgValue, v2: dish2.avgValue },
          ].map(({ label, v1, v2 }) => (
            <div key={label} className="grid grid-cols-3 border-t border-gray-100 px-4 py-3">
              <div className={`text-sm font-semibold ${v1 > v2 ? 'text-brand' : 'text-gray-700'}`}>{formatRating(v1)}</div>
              <div className="text-center text-xs text-gray-500 self-center">{label}</div>
              <div className={`text-right text-sm font-semibold ${v2 > v1 ? 'text-brand' : 'text-gray-700'}`}>{formatRating(v2)}</div>
            </div>
          ))}

          {/* Review counts */}
          <div className="grid grid-cols-3 border-t border-gray-100 px-4 py-3">
            <div className="text-sm text-gray-600">{dish1.reviewCount} reviews</div>
            <div className="text-center text-xs text-gray-500 self-center">Reviews</div>
            <div className="text-right text-sm text-gray-600">{dish2.reviewCount} reviews</div>
          </div>
        </div>
      )}
    </div>
  )
}
