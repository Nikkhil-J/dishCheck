import type { AdminRepository } from './adminRepository'
import type { DishRepository } from './dishRepository'
import type { DishRequestRepository } from './dishRequestRepository'
import type { NotificationRepository } from './notificationRepository'
import type { RestaurantRepository } from './restaurantRepository'
import type { RestaurantSearchRepository } from './restaurantSearchRepository'
import type { ReviewRepository } from './reviewRepository'
import type { UserRepository } from './userRepository'
import type { WishlistRepository } from './wishlistRepository'
import { FirebaseAdminRepository } from './firebase/firebaseAdminRepository'
import { FirebaseDishRepository } from './firebase/firebaseDishRepository'
import { FirebaseDishRequestRepository } from './firebase/firebaseDishRequestRepository'
import { FirebaseNotificationRepository } from './firebase/firebaseNotificationRepository'
import { FirebaseRestaurantRepository } from './firebase/firebaseRestaurantRepository'
import { FirebaseRestaurantSearchRepository } from './firebase/firebaseRestaurantSearchRepository'
import { FirebaseReviewRepository } from './firebase/firebaseReviewRepository'
import { FirebaseUserRepository } from './firebase/firebaseUserRepository'
import { FirebaseWishlistRepository } from './firebase/firebaseWishlistRepository'
import { isTypesenseConfigured, getTypesenseClient, getTypesenseSearchClient } from './typesense/typesenseClient'
import { TypesenseDishRepository } from './typesense/typesenseDishRepository'
import { TypesenseRestaurantRepository } from './typesense/typesenseRestaurantRepository'

export const userRepository: UserRepository = new FirebaseUserRepository()

const firebaseDishRepo = new FirebaseDishRepository()
export const dishRepository: DishRepository = isTypesenseConfigured()
  ? new TypesenseDishRepository(getTypesenseClient(), firebaseDishRepo, getTypesenseSearchClient())
  : firebaseDishRepo

export const restaurantRepository: RestaurantRepository = new FirebaseRestaurantRepository()

const firebaseRestaurantSearchRepo = new FirebaseRestaurantSearchRepository()
export const restaurantSearchRepository: RestaurantSearchRepository = isTypesenseConfigured()
  ? new TypesenseRestaurantRepository(getTypesenseClient(), firebaseRestaurantSearchRepo, getTypesenseSearchClient())
  : firebaseRestaurantSearchRepo

export const reviewRepository: ReviewRepository = new FirebaseReviewRepository()
export const wishlistRepository: WishlistRepository = new FirebaseWishlistRepository()
export const notificationRepository: NotificationRepository = new FirebaseNotificationRepository()
export const dishRequestRepository: DishRequestRepository = new FirebaseDishRequestRepository()
export const adminRepository: AdminRepository = new FirebaseAdminRepository()
