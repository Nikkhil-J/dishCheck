import { z } from 'zod'

export const userProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  favoriteCuisines: z.array(z.string()).optional(),
}).strip()

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>
