import { adminRepository, reviewRepository, userRepository } from '@/lib/repositories'

export function getAdminStats() {
  return adminRepository.getStats()
}

export function getFlaggedReviews(limit?: number) {
  return reviewRepository.getFlagged(limit)
}

export function getUsers(limit?: number) {
  return userRepository.list(limit)
}

async function adminPatch(url: string, token: string, body: Record<string, unknown>): Promise<boolean> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return response.ok
}

export function toggleAdmin(userId: string, isAdmin: boolean, token: string) {
  return adminPatch(`/api/admin/users/${encodeURIComponent(userId)}/role`, token, { isAdmin })
}

export function togglePremium(userId: string, isPremium: boolean, token: string) {
  return adminPatch(`/api/admin/users/${encodeURIComponent(userId)}/premium`, token, { isPremium })
}

export function unflagReview(reviewId: string, token: string) {
  return adminPatch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, token, {})
}

