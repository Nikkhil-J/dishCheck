import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin-server'
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/firebase/config'
import type { DishPointTransaction, PointsBalance } from '@/lib/types/rewards'
import type { AppendTransactionParams, PointsRepository } from '@/lib/repositories/pointsRepository'

function txDocToModel(id: string, data: FirebaseFirestore.DocumentData): DishPointTransaction {
  return {
    id,
    userId: data.userId as string,
    type: data.type as DishPointTransaction['type'],
    points: data.points as number,
    refId: (data.refId as string | null) ?? null,
    description: (data.description as string) ?? '',
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  }
}

export class FirebasePointsRepository implements PointsRepository {
  private txCollection(userId: string) {
    return adminDb
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(SUBCOLLECTIONS.POINT_TRANSACTIONS)
  }

  private userDoc(userId: string) {
    return adminDb.collection(COLLECTIONS.USERS).doc(userId)
  }

  async appendTransaction(params: AppendTransactionParams): Promise<DishPointTransaction> {
    const { userId, type, points, refId, description } = params

    const txRef = this.txCollection(userId).doc()
    const userRef = this.userDoc(userId)
    const now = Timestamp.now()

    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND')
      }

      const currentBalance = (userSnap.data()?.dishPointsBalance as number | undefined) ?? 0
      const newBalance = currentBalance + points

      if (newBalance < 0) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      tx.set(txRef, {
        userId,
        type,
        points,
        refId,
        description,
        createdAt: now,
      })

      const counterUpdate: Record<string, FirebaseFirestore.FieldValue> = {
        dishPointsBalance: FieldValue.increment(points),
      }
      if (points > 0) {
        counterUpdate.totalPointsEarned = FieldValue.increment(points)
      } else if (points < 0) {
        counterUpdate.totalPointsRedeemed = FieldValue.increment(Math.abs(points))
      }
      tx.update(userRef, counterUpdate)
    })

    return {
      id: txRef.id,
      userId,
      type,
      points,
      refId,
      description,
      createdAt: now.toDate().toISOString(),
    }
  }

  appendTransactionInTx(
    tx: Transaction,
    params: AppendTransactionParams,
    currentBalance: number,
  ): void {
    const { userId, type, points, refId, description } = params
    const newBalance = currentBalance + points

    if (newBalance < 0) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    const txRef = this.txCollection(userId).doc()
    const userRef = this.userDoc(userId)
    const now = Timestamp.now()

    tx.set(txRef, {
      userId,
      type,
      points,
      refId,
      description,
      createdAt: now,
    })

    const counterUpdate: Record<string, FirebaseFirestore.FieldValue> = {
      dishPointsBalance: FieldValue.increment(points),
    }
    if (points > 0) {
      counterUpdate.totalPointsEarned = FieldValue.increment(points)
    } else if (points < 0) {
      counterUpdate.totalPointsRedeemed = FieldValue.increment(Math.abs(points))
    }
    tx.update(userRef, counterUpdate)
  }

  async getBalance(userId: string): Promise<PointsBalance> {
    const userSnap = await this.userDoc(userId).get()
    if (!userSnap.exists) {
      return { balance: 0, totalEarned: 0, totalRedeemed: 0 }
    }

    const data = userSnap.data()!
    return {
      balance: (data.dishPointsBalance as number | undefined) ?? 0,
      totalEarned: (data.totalPointsEarned as number | undefined) ?? 0,
      totalRedeemed: (data.totalPointsRedeemed as number | undefined) ?? 0,
    }
  }

  async getTransactions(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: DishPointTransaction[]; nextCursor: string | null }> {
    let query = this.txCollection(userId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)

    if (cursor) {
      const cursorSnap = await this.txCollection(userId).doc(cursor).get()
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap)
      }
    }

    const snap = await query.get()
    const hasMore = snap.docs.length > limit
    const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs
    const items = docs.map((d) => txDocToModel(d.id, d.data()))
    const nextCursor = hasMore ? docs[docs.length - 1].id : null

    return { items, nextCursor }
  }
}
