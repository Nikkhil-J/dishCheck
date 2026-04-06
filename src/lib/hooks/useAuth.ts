'use client'

import { useEffect, type ReactNode } from 'react'
import { FirebaseClientAuthProvider } from '@/lib/auth/firebase-provider'
import { userRepository } from '@/lib/repositories'
import { useAuthStore } from '@/lib/store/authStore'
import { SUPPORTED_CITIES } from '@/lib/constants'

const authProvider = new FirebaseClientAuthProvider()

const SESSION_COOKIE = '__session'
const SESSION_MAX_AGE = 604800 // 7 days

function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE}; SameSite=Lax`
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

function syncCityCookieFromProfile(profileCity: string): void {
  const existing = document.cookie
    .split('; ')
    .find((row) => row.startsWith('dishcheck-city='))
    ?.split('=')[1]
  if (existing) return
  if (!(SUPPORTED_CITIES as readonly string[]).includes(profileCity)) return
  document.cookie = `dishcheck-city=${profileCity}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  localStorage.setItem('dishcheck-city', profileCity)
}

export async function signInWithGoogle() {
  await authProvider.signInWithGoogle()
  // Set session cookie immediately so middleware sees auth on first redirect.
  setSessionCookie()
}

export async function signInWithEmail(email: string, password: string) {
  const err = await authProvider.signInWithEmail(email, password)
  if (!err) {
    // Set session cookie immediately so middleware sees auth on first redirect.
    setSessionCookie()
  }
  return err
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const err = await authProvider.signUpWithEmail(email, password, name)
  if (!err) {
    // Ensure onboarding route can pass middleware right after sign up.
    setSessionCookie()
  }
  return err
}

export function sendPasswordReset(email: string) {
  return authProvider.sendPasswordReset(email)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, clearUser } = useAuthStore()

  useEffect(() => {
    const unsub = authProvider.onAuthStateChange(async (authUser) => {
      if (!authUser) {
        clearUser()
        clearSessionCookie()
        return
      }
      let user = await userRepository.getById(authUser.id)
      if (!user) {
        user = await userRepository.createFromAuthUser({
          id: authUser.id,
          displayName: authUser.displayName,
          email: authUser.email,
          avatarUrl: authUser.avatarUrl,
        })
      }
      setUser(user, authUser)
      setSessionCookie()
      if (user?.city) syncCityCookieFromProfile(user.city)
    })
    return unsub
  }, [setUser, clearUser])

  return children as React.ReactElement
}

export function useAuth() {
  const { user, authUser, isLoading } = useAuthStore()
  return { user, authUser, isLoading, isAuthenticated: !!user }
}

export async function logout() {
  await authProvider.signOut()
  useAuthStore.getState().clearUser()
  clearSessionCookie()
}
