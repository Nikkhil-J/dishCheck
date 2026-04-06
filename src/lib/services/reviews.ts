import { reviewRepository } from '@/lib/repositories'

export function getReview(reviewId: string) {
  return reviewRepository.getById(reviewId)
}

export function getReviewsByUser(userId: string, cursor?: string) {
  return reviewRepository.getMany({ userId, cursor }).then((result) => ({
    items: result.data,
    lastDoc: result.nextCursor ?? null,
    hasMore: result.hasMore,
  }))
}

