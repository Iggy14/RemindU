import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { disablePush, enablePush, readPushState, type PushState } from '@/lib/push'

const HINTS: Partial<Record<PushState, string>> = {
  unsupported: 'This browser cannot receive push notifications. On iPhone, add RemindU to your Home Screen and open it from there.',
  denied: 'Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.',
}

export function NotificationsCard() {
  const { session } = useAuth()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    readPushState().then(setState, () => setState('unsupported'))
  }, [])

  async function toggle() {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      setState(state === 'on' ? await disablePush() : await enablePush(session.user.id))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const canToggle = state === 'on' || state === 'off'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Get a push on this device when a reminder is due: your own, plus everything in your shared space.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {state && HINTS[state] && <p className="text-sm text-muted-foreground">{HINTS[state]}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {canToggle && (
          <Button variant={state === 'on' ? 'outline' : 'default'} onClick={toggle} disabled={busy}>
            {state === 'on' ? <BellOff data-icon="inline-start" /> : <Bell data-icon="inline-start" />}
            {state === 'on' ? 'Turn off on this device' : 'Turn on notifications'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
