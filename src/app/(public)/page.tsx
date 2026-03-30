import Link from 'next/link'
import { getTopDishes } from '@/lib/firebase/dishes'
import { getAllRestaurants } from '@/lib/firebase/restaurants'
import { DishCard } from '@/components/features/DishCard'
import { RestaurantCard } from '@/components/features/RestaurantCard'
import { CUISINE_TYPES } from '@/lib/constants'

export const revalidate = 3600

export default async function LandingPage() {
  const [topDishes, restaurants] = await Promise.all([
    getTopDishes(6),
    getAllRestaurants(),
  ])

  const featuredRestaurants = restaurants.slice(0, 4)

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-light to-surface px-4 py-20 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Discover the best dishes in{' '}
          <span className="text-brand">Bengaluru</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Honest reviews from real food lovers. Find your next favourite dish — not just the restaurant.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/browse" className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-dark">
            Browse Dishes
          </Link>
          <Link href="/search" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Search
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { icon: '🔍', title: 'Search a dish', desc: 'Look up any dish by name, cuisine, or restaurant.' },
            { icon: '⭐', title: 'Read reviews', desc: 'See ratings for taste, portion size, and value.' },
            { icon: '✍️', title: 'Share your take', desc: 'Write a review and help others find great food.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
              <span className="text-4xl">{icon}</span>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top dishes */}
      {topDishes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Top rated dishes</h2>
            <Link href="/browse" className="text-sm font-medium text-brand hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </section>
      )}

      {/* Browse by cuisine */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900">Browse by cuisine</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {CUISINE_TYPES.slice(0, 12).map((cuisine) => (
            <Link
              key={cuisine}
              href={`/browse?cuisine=${encodeURIComponent(cuisine)}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:border-brand hover:text-brand"
            >
              {cuisine}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured restaurants */}
      {featuredRestaurants.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-2xl font-bold text-gray-900">Featured restaurants</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRestaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand px-4 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Start exploring</h2>
        <p className="mt-2 text-brand-light">Join the community and share your honest reviews.</p>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand hover:bg-brand-light"
        >
          Create free account
        </Link>
      </section>
    </>
  )
}
