import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'

type Mode = 'signin' | 'signup'

/** Turns raw Supabase auth errors into something a person can act on. */
function friendlyError(message: string, mode: Mode): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email and password don’t match. Check them and try again.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('fetch') || m.includes('network')) return 'Can’t reach the server. Check your connection and try again.'
  return mode === 'signin' ? `Couldn’t sign you in: ${message}` : `Couldn’t create your account: ${message}`
}

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)

  const isSignUp = mode === 'signup'

  function changeMode(next: Mode) {
    setMode(next)
    setError(null)
    setConfirmEmail(false)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (isSignUp) {
      const result = await signUp(email.trim(), password, displayName.trim())
      if (result.error) setError(friendlyError(result.error, mode))
      else if (result.needsConfirmation) setConfirmEmail(true)
    } else {
      const message = await signIn(email.trim(), password)
      if (message) setError(friendlyError(message, mode))
    }
    setBusy(false)
  }

  if (forgot) {
    return (
      <Shell>
        <ForgotPasswordCard initialEmail={email} onBack={() => setForgot(false)} />
      </Shell>
    )
  }

  if (confirmEmail) {
    return (
      <Shell>
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="items-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Open it, then come
              back and sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => changeMode('signin')}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create your account' : 'Welcome back'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'It only takes a minute.' : 'Sign in to see what needs your attention.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
          </Tabs>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {isSignUp && (
                <Field>
                  <FieldLabel htmlFor="name">Your name</FieldLabel>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="e.g. Alex"
                    required
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  autoFocus={!isSignUp}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {!isSignUp && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setForgot(true)}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {isSignUp && <FieldDescription>At least 8 characters.</FieldDescription>}
              </Field>
              {error && <FieldError role="alert">{error}</FieldError>}
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {busy ? (isSignUp ? 'Creating account…' : 'Signing in…') : isSignUp ? 'Create account' : 'Sign in'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </Shell>
  )
}

function ForgotPasswordCard({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await requestPasswordReset(email.trim())
    if (message) setError(friendlyError(message, 'signin').replace('Couldn’t sign you in', 'Couldn’t send the link'))
    else setSent(true)
    setBusy(false)
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for <strong className="text-foreground">{email}</strong>, we sent a link to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={onBack}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your email and we’ll send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {error && <FieldError role="alert">{error}</FieldError>}
            <Button type="submit" size="lg" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <Button type="button" variant="ghost" onClick={onBack}>
              Back to sign in
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#fae9d6] p-4">
      <img
        src="/logo.webp"
        alt="RemindU — never miss a moment"
        width={320}
        height={215}
        className="w-64 rounded-2xl shadow-sm sm:w-72"
      />
      {children}
    </div>
  )
}
