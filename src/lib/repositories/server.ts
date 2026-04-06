import 'server-only'

import type { CouponRepository } from './couponRepository'
import type { PointsRepository } from './pointsRepository'
import { FirebaseCouponRepository } from './firebase/firebaseCouponRepository'
import { FirebasePointsRepository } from './firebase/firebasePointsRepository'

export const pointsRepository: PointsRepository = new FirebasePointsRepository()
export const couponRepository: CouponRepository = new FirebaseCouponRepository()
