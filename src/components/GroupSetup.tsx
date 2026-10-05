import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createGroup, joinGroup } from '@/lib/groups'

export function GroupSetup({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    run(() => createGroup(name.trim()))
  }
  const onJoin = (e: FormEvent) => {
    e.preventDefault()
    run(() => joinGroup(code.trim()))
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Start a shared space</CardTitle>
          <CardDescription>Create one, then share the invite code with your partner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="group-name">Space name</FieldLabel>
                <Input
                  id="group-name"
                  required
                  placeholder="Us"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                Create
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Have an invite code?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onJoin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite-code">Invite code</FieldLabel>
                <Input
                  id="invite-code"
                  required
                  className="uppercase"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" variant="secondary" disabled={busy}>
                Join
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
