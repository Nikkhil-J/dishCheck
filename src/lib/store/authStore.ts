import { create } from 'zustand'
import type { User } from '@/lib/types'
import type { AuthSessionUser } from '@/lib/auth/provider'

interface AuthState {
  user: User | null
  authUser: AuthSessionUser | null
  isLoading: boolean
  setUser: (user: User | null, authUser: AuthSessionUser | null) => void
  clearUser: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authUser: null,
  isLoading: true,
  setUser: (user, authUser) => set({ user, authUser, isLoading: false }),
  clearUser: () => set({ user: null, authUser: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))
