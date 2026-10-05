import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InviteCodeCardProps = {
  code: string
  groupName: string
}

export function InviteCodeCard({ code, groupName }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the code is still visible to copy by hand.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Join me on RemindU', text: `Join "${groupName}" on RemindU with code ${code}` })
    } catch {
      // User dismissed the share sheet.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite your partner</CardTitle>
        <CardDescription>They enter this code after signing up to join your space.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-lg bg-muted px-4 py-3 text-center font-mono text-3xl tracking-[0.3em]">{code}</div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={copy}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
          {canShare && (
            <Button className="flex-1" onClick={share}>
              <Share2 data-icon="inline-start" />
              Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
