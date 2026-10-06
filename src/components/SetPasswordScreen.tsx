import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Shell } from '@/components/AuthScreen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'

/** Shown after the user opens a password-reset link from their email. */
export function SetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await updatePassword(password)
    if (message) setError(`Couldn’t update your password: ${message}`)
    setBusy(false)
  }

  return (
    <Shell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>You’ll stay signed in once it’s saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
              </Field>
              {error && <FieldError role="alert">{error}</FieldError>}
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {busy ? 'Saving…' : 'Save password'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </Shell>
  )
}
