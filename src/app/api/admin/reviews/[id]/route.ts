import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-server'
import { AdminAuthError, assertAdmin } from '@/lib/auth/assert-admin'
import { COLLECTIONS } from '@/lib/firebase/config'
import { computeLevel, computeEarnedBadges } from '@/lib/gamification'
import { computeOverall, computeTopTags } from '@/lib/utils/index'
import { captureError } from '@/lib/monitoring/sentry'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await assertAdmin(req)
    const { id } = await context.params

    await adminDb.collection(COLLECTIONS.REVIEWS).doc(id).update({
      isFlagged: false,
      isApproved: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    captureError(error, { route: '/api/admin/reviews/[id]' })
    return NextResponse.json({ message: 'Failed to approve review' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    await assertAdmin(req)
    const { id } = await context.params
    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(id)

    const deletedReview = await adminDb.runTransaction(async (tx) => {
      const reviewSnap = await tx.get(reviewRef)
      if (!reviewSnap.exists) throw new Error('REVIEW_NOT_FOUND')

      const review = reviewSnap.data()
      const dishId = review?.dishId as string | undefined
      const authorId = review?.userId as string | undefined
      if (!dishId || !authorId) throw new Error('INVALID_REVIEW')

      const dishRef = adminDb.collection(COLLECTIONS.DISHES).doc(dishId)
      const dishSnap = await tx.get(dishRef)
      if (!dishSnap.exists) throw new Error('DISH_NOT_FOUND')

      const dish = dishSnap.data()
      const prevCount = Number(dish?.reviewCount ?? 0)
      const newCount = Math.max(prevCount - 1, 0)

      let avgTaste = 0
      let avgPortion = 0
      let avgValue = 0
      let avgOverall = 0

      if (newCount > 0) {
        avgTaste = ((Number(dish?.avgTaste ?? 0) * prevCount) - Number(review?.tasteRating ?? 0)) / newCount
        avgPortion = ((Number(dish?.avgPortion ?? 0) * prevCount) - Number(review?.portionRating ?? 0)) / newCount
        avgValue = ((Number(dish?.avgValue ?? 0) * prevCount) - Number(review?.valueRating ?? 0)) / newCount
        avgOverall = computeOverall(avgTaste, avgPortion, avgValue)
      }

      tx.delete(reviewRef)
      tx.update(dishRef, {
        avgTaste,
        avgPortion,
        avgValue,
        avgOverall,
        reviewCount: newCount,
      })

      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(authorId)
      const userSnap = await tx.get(userRef)
      if (userSnap.exists) {
        const userData = userSnap.data()
        const newReviewCount = Math.max(Number(userData?.reviewCount ?? 0) - 1, 0)
        const helpfulVotes = Number(userData?.helpfulVotesReceived ?? 0)
        const level = computeLevel(newReviewCount)
        const badges = computeEarnedBadges(newReviewCount, helpfulVotes)
        tx.update(userRef, {
          reviewCount: newReviewCount,
          level,
          badges,
        })
      }

      return { dishId }
    })

    const tagsSnap = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('dishId', '==', deletedReview.dishId)
      .where('isApproved', '==', true)
      .get()
    const allTagArrays = tagsSnap.docs.map((doc) => (doc.data().tags as string[] | undefined) ?? [])
    const topTags = computeTopTags(allTagArrays)
    await adminDb.collection(COLLECTIONS.DISHES).doc(deletedReview.dishId).update({ topTags })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    if (error instanceof Error) {
      if (error.message === 'REVIEW_NOT_FOUND') {
        return NextResponse.json({ message: 'Review not found' }, { status: 404 })
      }

      if (error.message === 'DISH_NOT_FOUND') {
        return NextResponse.json({ message: 'Dish not found' }, { status: 400 })
      }

      if (error.message === 'INVALID_REVIEW') {
        return NextResponse.json({ message: 'Review data is invalid' }, { status: 400 })
      }
    }

    captureError(error, { route: '/api/admin/reviews/[id]' })
    return NextResponse.json({ message: 'Failed to delete review' }, { status: 500 })
  }
}
