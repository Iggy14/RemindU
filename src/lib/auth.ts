import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthState = {
  session: Session | null
  loading: boolean
  /** Returns an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>
  /** `needsConfirmation` is true when the project requires email confirmation. */
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  /** Emails a password-reset link. Returns an error message, or null on success. */
  requestPasswordReset: (email: string) => Promise<string | null>
  /** True after the user opens a reset link, until they choose a new password. */
  recovering: boolean
  /** Sets a new password for the current (recovery) session. Returns an error message, or null. */
  updatePassword: (password: string) => Promise<string | null>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
