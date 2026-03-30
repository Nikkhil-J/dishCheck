'use client'

import { useEffect, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { getUser, createUser } from '@/lib/firebase/users'
import { useAuthStore } from '@/lib/store/authStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, clearUser } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        clearUser()
        return
      }
      let user = await getUser(fbUser.uid)
      if (!user) user = await createUser(fbUser)
      setUser(user, fbUser)
    })
    return unsub
  }, [setUser, clearUser])

  return children as React.ReactElement
}

export function useAuth() {
  const { user, firebaseUser, isLoading } = useAuthStore()
  return { user, firebaseUser, isLoading, isAuthenticated: !!user }
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
    return null
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Sign in failed'
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<string | null> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })
    return null
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Sign up failed'
  }
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  try {
    await sendPasswordResetEmail(auth, email)
    return null
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Failed to send reset email'
  }
}

export async function logout() {
  await signOut(auth)
  useAuthStore.getState().clearUser()
}
