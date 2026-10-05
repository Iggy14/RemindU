import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === 'signup'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (isSignUp) {
      const result = await signUp(email, password, displayName.trim())
      setError(result.error)
      if (result.needsConfirmation) setNotice('Check your email to confirm your account, then sign in.')
    } else {
      setError(await signIn(email, password))
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create your account' : 'Welcome back'}</CardTitle>
          <CardDescription>RemindU keeps track of what needs your attention.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {isSignUp && (
                <Field>
                  <FieldLabel htmlFor="name">Your name</FieldLabel>
                  <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
              <Button type="submit" disabled={busy}>
                {isSignUp ? 'Sign up' : 'Sign in'}
              </Button>
              <Button type="button" variant="link" onClick={() => setMode(isSignUp ? 'signin' : 'signup')}>
                {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
