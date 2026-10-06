import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'
import { useGroup } from '@/lib/group-context'
import { leaveGroup } from '@/lib/groups'

/** Leave the current space; the app then offers to create or join another. */
export function LeaveGroupCard({ userId }: { userId: string }) {
  const { group, reload } = useGroup()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leave() {
    setBusy(true)
    setError(null)
    try {
      await leaveGroup(group.id, userId)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not leave the space')
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch space</CardTitle>
        <CardDescription>Leave this space to create a new one or join another with an invite code.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {confirming ? (
          <>
            <p className="text-sm">
              Leave <span className="font-medium">{group.name}</span>? Your private reminders in it will be deleted. Shared
              reminders stay with the space. You can rejoin later with the invite code.
            </p>
            {error && <FieldError>{error}</FieldError>}
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy} onClick={leave}>
                Leave space
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>
            Leave space
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
