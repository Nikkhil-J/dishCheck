import { Fragment } from 'react'
import { cn } from '@/lib/utils'

interface StatDef {
  value: string
  suffix?: string
  label: string
  sub?: string
  badge?: string
}

interface StatsBarProps {
  restaurantCount: number
  reviewCount: number
  cityCount: number
}

export function StatsBar({ restaurantCount, reviewCount, cityCount }: StatsBarProps) {
  const stats: StatDef[] = [
    { value: `${restaurantCount}`, suffix: '+', label: 'Restaurants', badge: 'Growing fast' },
    { value: `${reviewCount}`, suffix: '+', label: 'Dish Reviews', sub: 'from real diners' },
    { value: `${cityCount}`, label: 'Cities', sub: 'and counting' },
  ]

  return (
    <div className="py-4 sm:px-12 sm:py-8">
      <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:justify-evenly sm:gap-0">
        {stats.map((stat, i) => (
          <Fragment key={stat.label}>
            {i > 0 && (
              <div
                className="hidden h-[60px] w-px shrink-0 sm:block"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)',
                }}
              />
            )}
            <div
              className={cn(
                'flex flex-col items-center justify-center text-center sm:flex-1',
              )}
            >
              <p className="font-display text-2xl font-bold tracking-tight text-primary sm:text-[48px]">
                {stat.value}
                {stat.suffix && (
                  <span className="ml-px inline-block align-top text-base leading-[1.4] sm:text-[28px]">
                    {stat.suffix}
                  </span>
                )}
              </p>

              <p className="mt-1 font-sans text-[9px] font-medium uppercase tracking-widest text-text-muted sm:mt-2 sm:text-[10px]">
                {stat.label}
              </p>

              {stat.sub && (
                <p className="mt-0.5 text-[10px] italic text-primary/50 sm:mt-1 sm:text-[11px]">
                  {stat.sub}
                </p>
              )}

              {stat.badge && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.12] px-2 py-0.5 text-[10px] text-primary sm:mt-1.5">
                  ↑ {stat.badge}
                </span>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
