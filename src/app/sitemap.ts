import { MetadataRoute } from 'next'
import { getAllRestaurants } from '@/lib/firebase/restaurants'
import { getTopDishes } from '@/lib/firebase/dishes'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dishcheck.app'

  const [restaurants, dishes] = await Promise.all([
    getAllRestaurants(),
    getTopDishes(100),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1 },
    { url: `${baseUrl}/browse`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/search`, priority: 0.7 },
  ]

  const restaurantRoutes: MetadataRoute.Sitemap = restaurants.map((r) => ({
    url: `${baseUrl}/restaurant/${r.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const dishRoutes: MetadataRoute.Sitemap = dishes.map((d) => ({
    url: `${baseUrl}/dish/${d.id}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...restaurantRoutes, ...dishRoutes]
}
