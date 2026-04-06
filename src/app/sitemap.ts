import { MetadataRoute } from 'next'
import { getAllRestaurantsForSitemap } from '@/lib/services/restaurants'
import { getAllActiveDishes } from '@/lib/services/dishes'
import { CUISINE_TYPES } from '@/lib/constants'

function toDate(value: string | undefined | null): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dishcheck.app'

  const [restaurants, dishes] = await Promise.all([
    getAllRestaurantsForSitemap(),
    getAllActiveDishes(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1 },
    { url: `${baseUrl}/explore`, changeFrequency: 'daily', priority: 0.9 },
  ]

  const cuisineRoutes: MetadataRoute.Sitemap = CUISINE_TYPES.map((c) => ({
    url: `${baseUrl}/cuisine/${c.toLowerCase().replace(/\s+/g, '-')}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const restaurantRoutes: MetadataRoute.Sitemap = restaurants.map((r) => ({
    url: `${baseUrl}/restaurant/${r.id}`,
    lastModified: toDate(r.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const dishRoutes: MetadataRoute.Sitemap = dishes.map((d) => ({
    url: `${baseUrl}/dish/${d.id}`,
    lastModified: toDate(d.createdAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...cuisineRoutes, ...restaurantRoutes, ...dishRoutes]
}
