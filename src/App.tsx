import { AppShell } from '@/components/AppShell'
import { AuthProvider } from '@/components/AuthProvider'
import { AuthScreen } from '@/components/AuthScreen'
import { SetPasswordScreen } from '@/components/SetPasswordScreen'
import { GroupGate } from '@/components/GroupGate'
import { ScreenMessage } from '@/components/ScreenMessage'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

function SignedInGate() {
  const { session, loading, recovering } = useAuth()
  if (loading) return <ScreenMessage>Loading…</ScreenMessage>
  if (!session) return <AuthScreen />
  if (recovering) return <SetPasswordScreen />
  // key resets group state if a different user signs in on the same device
  return (
    <GroupGate key={session.user.id} userId={session.user.id}>
      <AppShell />
    </GroupGate>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return (
      <ScreenMessage>
        Supabase isn&apos;t configured. Copy <code className="mx-1">.env.example</code> to{' '}
        <code className="mx-1">.env.local</code> and fill it in.
      </ScreenMessage>
    )
  }
  return (
    <AuthProvider>
      <SignedInGate />
    </AuthProvider>
  )
}

export default App
