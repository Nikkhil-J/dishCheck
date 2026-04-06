import type { Review, ReviewFormData, User } from '@/lib/types'
import type { PaginatedData } from './dishRepository'

export interface GetReviewsParams {
  dishId?: string
  userId?: string
  limit?: number
  cursor?: string
}

export interface ReviewRepository {
  getById(reviewId: string): Promise<Review | null>
  getMany(params: GetReviewsParams): Promise<PaginatedData<Review>>
  findByUserAndDish(userId: string, dishId: string): Promise<Review | null>
  getRecentByUser(userId: string, limit: number): Promise<Review[]>
  create(data: ReviewFormData, user: User, photoUrl: string): Promise<Review | null>
  update(
    reviewId: string,
    callerId: string,
    updates: Partial<Pick<Review, 'tasteRating' | 'portionRating' | 'valueRating' | 'tags' | 'text'>>
  ): Promise<Review | null>
  delete(reviewId: string, dishId: string, callerId: string, isAdmin?: boolean): Promise<boolean>
  voteHelpful(reviewId: string, voterId: string): Promise<boolean>
  flag(reviewId: string, userId: string): Promise<'ok' | 'already_flagged' | null>
  getFlagged(limit?: number): Promise<Review[]>
  unflag(reviewId: string): Promise<boolean>
}
