'use client'

import Link from 'next/link'
import { SubRatingBar } from '@/components/ui/SubRatingBar'
import { formatRating } from '@/lib/utils/index'
import type { DishSentiment } from '@/lib/services/restaurant-analytics'

interface DishSentimentCardProps {
  dish: DishSentiment
  restaurantId: string
}

export function DishSentimentCard({ dish }: DishSentimentCardProps) {
  const sortedTags = Object.entries(dish.tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const maxTagCount = sortedTags.length > 0 ? sortedTags[0][1] : 1

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/dish/${dish.dishId}`}
            className="font-display font-semibold text-bg-dark hover:text-primary"
          >
            {dish.dishName}
          </Link>
          <p className="text-xs text-text-muted">{dish.category} · {dish.reviewCount} reviews</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light">
          <span className="text-sm font-bold text-primary-dark">{formatRating(dish.avgOverall)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <SubRatingBar label="Taste" value={dish.avgTaste} />
        <SubRatingBar label="Portion" value={dish.avgPortion} />
        <SubRatingBar label="Value" value={dish.avgValue} />
      </div>

      {sortedTags.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-text-secondary">Tag frequency</p>
          <div className="flex flex-wrap gap-2">
            {sortedTags.map(([tag, count]) => {
              const intensity = Math.round((count / maxTagCount) * 100)
              return (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `hsl(24 90% ${95 - intensity * 0.3}%)`,
                    color: intensity > 60 ? 'hsl(24 80% 30%)' : 'hsl(24 30% 50%)',
                  }}
                >
                  {tag} <span className="opacity-60">({count})</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {dish.recentSnippets.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold text-text-secondary">Recent reviews</p>
          <div className="space-y-2">
            {dish.recentSnippets.map((snippet) => (
              <div key={snippet.reviewId} className="text-xs">
                <p className="text-text-primary line-clamp-2">&ldquo;{snippet.text}&rdquo;</p>
                <p className="mt-0.5 text-text-muted">
                  {snippet.userName} · {formatRating(snippet.avgOverall)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
