export interface AuthProvider {
  getCurrentUser(): Promise<{ id: string; email?: string } | null>
  verifyToken(token: string): Promise<{ userId: string }>
}

export interface AuthSessionUser {
  id: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  getIdToken(): Promise<string>
}

export interface ClientAuthProvider extends AuthProvider {
  onAuthStateChange(callback: (user: AuthSessionUser | null) => void): () => void
  signInWithGoogle(): Promise<void>
  signInWithEmail(email: string, password: string): Promise<string | null>
  signUpWithEmail(email: string, password: string, name: string): Promise<string | null>
  sendPasswordReset(email: string): Promise<string | null>
  signOut(): Promise<void>
}
