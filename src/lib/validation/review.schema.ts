import { z } from 'zod'
import { TAG_LIST, MAX_RATING } from '@/lib/constants'

const ratingField = z.number().min(1).max(MAX_RATING)

export const createReviewSchema = z.object({
  dishId: z.string().min(1),
  restaurantId: z.string().min(1),
  tasteRating: ratingField,
  portionRating: ratingField,
  valueRating: ratingField,
  tags: z.array(z.enum(TAG_LIST)).default([]),
  text: z.string().min(30, 'Review must be at least 30 characters'),
  photoUrl: z.string().min(1).optional(),
  billUrl: z.string().min(1).optional(),
}).strip()

export type CreateReviewInput = z.infer<typeof createReviewSchema>

export const updateReviewSchema = z.object({
  tasteRating: ratingField.optional(),
  portionRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  tags: z.array(z.enum(TAG_LIST)).optional(),
  text: z.string().optional(),
}).strip()

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
