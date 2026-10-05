import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Draft } from '@/ai/draft'
import { computeNextDue, describeRule, todayIn } from '@/ruleEngine'

type DraftCardProps = {
  draft: Draft
  /** The reminder as it is now, when this card is a change to an existing one */
  before?: Draft
  timezone: string
  outcome?: 'saved' | 'discarded'
  busy: boolean
  onConfirm: () => void
  onDiscard: () => void
}

function rows(draft: Draft, timezone: string): [label: string, value: string][] {
  const reminders = [...draft.offsets]
    .sort((a, b) => b.offsetDays - a.offsetDays)
    .map((o) => (o.offsetDays === 0 ? 'on the day' : `${o.offsetDays}d before`))
    .join(', ')
  return [
    ['Name', draft.title],
    ['Type', draft.category],
    ['Who sees it', draft.shared ? 'Shared' : 'Just me'],
    ['Repeats', describeRule(draft.rule)],
    ['Next due', computeNextDue(draft.rule, todayIn(timezone))],
    ['Remind me', reminders || 'No reminders'],
  ]
}

/** The "confirm before saving" step: AI output is untrusted, so the user always approves it. */
export function DraftCard({ draft, before, timezone, outcome, busy, onConfirm, onDiscard }: DraftCardProps) {
  const previous = before ? new Map(rows(before, timezone)) : null

  return (
    <Card size="sm" className="mt-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {before ? 'Update reminder' : 'New reminder'}
          {draft.shared && <Badge variant="outline">Shared</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {rows(draft, timezone).map(([label, value]) => {
            const old = previous?.get(label)
            const changed = old !== undefined && old !== value
            return (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={`${label === 'Type' ? 'capitalize' : ''} ${changed ? 'font-medium' : ''}`}>
                  {changed && <span className="mr-1.5 text-muted-foreground line-through">{old}</span>}
                  {value}
                </dd>
              </div>
            )
          })}
        </dl>
        {outcome ? (
          <p className="text-muted-foreground">{outcome === 'saved' ? 'Saved.' : 'Discarded.'}</p>
        ) : (
          <div className="flex gap-2">
            <Button onClick={onConfirm} disabled={busy}>
              {before ? 'Update' : 'Save'}
            </Button>
            <Button variant="outline" onClick={onDiscard} disabled={busy}>
              Discard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
