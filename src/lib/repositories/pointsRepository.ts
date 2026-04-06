import type { Transaction } from 'firebase-admin/firestore'
import type { DishPointTransaction, PointsBalance, PointTransactionType } from '@/lib/types/rewards'

export interface AppendTransactionParams {
  userId: string
  type: PointTransactionType
  points: number
  refId: string | null
  description: string
}

export interface PointsRepository {
  appendTransaction(params: AppendTransactionParams): Promise<DishPointTransaction>
  appendTransactionInTx(
    tx: Transaction,
    params: AppendTransactionParams,
    currentBalance: number,
  ): void
  getBalance(userId: string): Promise<PointsBalance>
  getTransactions(userId: string, limit: number, cursor?: string): Promise<{
    items: DishPointTransaction[]
    nextCursor: string | null
  }>
}
