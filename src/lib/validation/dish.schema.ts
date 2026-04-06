import { z } from 'zod'

const dietaryValues = ['veg', 'non-veg', 'egg'] as const
const priceRangeValues = ['under-100', '100-200', '200-400', '400-600', 'above-600'] as const
const sortByValues = ['highest-rated', 'newest', 'most-helpful'] as const

export const dishSearchParamsSchema = z.object({
  q: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  area: z.string().nullable().default(null),
  cuisine: z.string().nullable().default(null),
  dietary: z.enum(dietaryValues).nullable().default(null),
  priceRange: z.enum(priceRangeValues).nullable().default(null),
  sortBy: z.enum(sortByValues).default('highest-rated'),
  cursor: z.string().nullable().default(null),
}).strip()

export type DishSearchParams = z.infer<typeof dishSearchParamsSchema>
