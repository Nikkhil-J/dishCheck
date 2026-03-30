import { create } from 'zustand'
import type { User } from '@/lib/types'
import type { User as FirebaseUser } from 'firebase/auth'

interface AuthState {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  setUser: (user: User | null, firebaseUser: FirebaseUser | null) => void
  clearUser: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  setUser: (user, firebaseUser) => set({ user, firebaseUser, isLoading: false }),
  clearUser: () => set({ user: null, firebaseUser: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))
