import Link from 'next/link'
import { getTopDishes, getDishCount } from '@/lib/services/dishes'
import { DishCard } from '@/components/features/DishCard'
import { RestaurantCard } from '@/components/features/RestaurantCard'
import { LandingCTA } from '@/components/features/LandingCTA'
import { HeroSection } from '@/components/features/HeroSection'
import { CityPills } from '@/components/features/CityPills'
import { CUISINE_TYPES, CUISINE_EMOJI, SUPPORTED_CITIES } from '@/lib/constants'
import { listRestaurants } from '@/lib/services/catalog'
import { getRestaurantCount } from '@/lib/services/restaurants'
import { Reveal, RevealGrid } from '@/components/ui/AnimateReveal'
import { getCityFromCookie } from '@/lib/utils/get-city-from-cookie'
import { captureError } from '@/lib/monitoring/sentry'
import type { Dish } from '@/lib/types'

export const revalidate = 3600

const HOW_IT_WORKS = [
  { icon: '🔍', title: 'Search a dish', desc: 'Find a specific dish at a specific restaurant.' },
  { icon: '📸', title: 'Read real reviews', desc: 'See photos, sub-ratings, and honest tags from food lovers.' },
  { icon: '✍️', title: 'Share your take', desc: 'Rate taste, portion, and value. Help others decide.' },
]

export default async function LandingPage() {
  const selectedCity = await getCityFromCookie()

  let topDishes: Dish[] = []
  let restaurantsResult: { city: string; areas: readonly string[]; items: import('@/lib/types').Restaurant[] } = { city: selectedCity ?? 'Bengaluru', areas: [], items: [] }
  let dishCount = 0
  let restaurantCount = 0

  try {
    const [dishes, restaurants, dCount, rCount] = await Promise.all([
      getTopDishes(6, selectedCity),
      listRestaurants({ city: selectedCity, limit: 4 }),
      getDishCount(),
      getRestaurantCount(selectedCity ?? undefined),
    ])
    topDishes = dishes
    restaurantsResult = restaurants
    dishCount = dCount
    restaurantCount = rCount
  } catch (error) {
    captureError(error, { route: 'LandingPage', extra: { context: 'data fetching' } })
  }

  const featuredRestaurants = restaurantsResult.items

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-bg-cream via-bg-warm to-surface px-6 py-16 text-center sm:py-24">
        <HeroSection />
      </section>

      {/* Social proof stats */}
      <Reveal>
        <section className="mx-auto -mt-1 max-w-4xl px-6 pb-12">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { num: dishCount > 0 ? `${dishCount}+` : '0', label: 'Dishes reviewed' },
              { num: restaurantCount > 0 ? `${restaurantCount}+` : '0', label: 'Restaurants' },
              { num: `${SUPPORTED_CITIES.length}+`, label: 'Cities' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-bold text-primary">{stat.num}</p>
                <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Top dishes */}
      {topDishes.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-bg-dark">Top rated dishes</h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold text-primary transition-all hover:gap-2">
              See all <span>&rsaquo;</span>
            </Link>
          </div>
          <RevealGrid className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topDishes.map((dish, i) => (
              <div key={dish.id} data-reveal="" style={{ '--reveal-index': i } as React.CSSProperties}>
                <DishCard dish={dish} index={i} />
              </div>
            ))}
          </RevealGrid>
        </section>
      )}

      {/* Browse by cuisine */}
      <Reveal>
        <section className="mx-auto max-w-[1200px] px-6 py-12">
          <h2 className="font-display text-2xl font-bold text-bg-dark">Browse by cuisine</h2>
          <RevealGrid className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {CUISINE_TYPES.slice(0, 10).map((cuisine, i) => (
              <Link
                key={cuisine}
                href={`/explore?cuisine=${encodeURIComponent(cuisine)}`}
                data-reveal=""
                style={{ '--reveal-index': i } as React.CSSProperties}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <span className="text-3xl">{CUISINE_EMOJI[cuisine] ?? '🍴'}</span>
                <span className="text-sm font-medium text-text-primary">{cuisine}</span>
              </Link>
            ))}
          </RevealGrid>
        </section>
      </Reveal>

      {/* How it works */}
      <section className="bg-bg-cream px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-bold text-bg-dark">How it works</h2>
          </Reveal>
          <RevealGrid className="mt-10 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} data-reveal="" style={{ '--reveal-index': i } as React.CSSProperties} className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-card text-3xl shadow-sm">
                  {step.icon}
                </div>
                <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-bg-dark">{step.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{step.desc}</p>
              </div>
            ))}
          </RevealGrid>
        </div>
      </section>

      {/* Featured restaurants */}
      {featuredRestaurants.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-bg-dark">
              Featured restaurants in {restaurantsResult.city}
            </h2>
            <CityPills currentCity={restaurantsResult.city} />
          </div>
          <RevealGrid className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRestaurants.map((r, i) => (
              <div key={r.id} data-reveal="" style={{ '--reveal-index': i } as React.CSSProperties}>
                <RestaurantCard restaurant={r} index={i} />
              </div>
            ))}
          </RevealGrid>
        </section>
      )}

      {/* CTA */}
      <LandingCTA />
    </>
  )
}
