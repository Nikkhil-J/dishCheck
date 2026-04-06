import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './config'
import { logError } from '../logger'

const googleProvider = new GoogleAuthProvider()

/** Signs in with Google popup. Returns the Firebase UserCredential. */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider)
}

/** Signs in with email/password. Returns null on success, error message on failure. */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<string | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
    return null
  } catch (e: unknown) {
    logError('signInWithEmailPassword', e)
    return e instanceof Error ? e.message : 'Sign in failed'
  }
}

/**
 * Creates an account with email/password and sets displayName.
 * Calls updateProfile THEN triggers a manual reload so the
 * onAuthStateChanged listener picks up the displayName.
 * Returns null on success.
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  name: string
): Promise<string | null> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })
    await user.reload()
    return null
  } catch (e: unknown) {
    logError('signUpWithEmailPassword', e)
    return e instanceof Error ? e.message : 'Sign up failed'
  }
}

/** Sends a password reset email. Returns null on success, error message on failure. */
export async function resetPassword(email: string): Promise<string | null> {
  try {
    await sendPasswordResetEmail(auth, email)
    return null
  } catch (e: unknown) {
    logError('resetPassword', e)
    return e instanceof Error ? e.message : 'Failed to send reset email'
  }
}

/** Signs the current user out. */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (e) {
    logError('signOutUser', e)
  }
}
