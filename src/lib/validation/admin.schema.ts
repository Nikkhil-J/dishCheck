import { z } from 'zod'
import { DISH_CATEGORIES } from '@/lib/constants'

export const toggleAdminSchema = z.object({
  isAdmin: z.boolean(),
}).strip()

export type ToggleAdminInput = z.infer<typeof toggleAdminSchema>

export const togglePremiumSchema = z.object({
  isPremium: z.boolean(),
}).strip()

export type TogglePremiumInput = z.infer<typeof togglePremiumSchema>

const dishCategoryValues = DISH_CATEGORIES.map((c) => c) as [string, ...string[]]
const dietaryValues = ['veg', 'non-veg', 'egg'] as [string, ...string[]]

export const dishRequestActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional(),
  category: z.enum(dishCategoryValues).optional(),
  dietary: z.enum(dietaryValues).optional(),
}).strip()

export type DishRequestActionInput = z.infer<typeof dishRequestActionSchema>
