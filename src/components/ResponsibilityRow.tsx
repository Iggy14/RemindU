import { Check, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DueBadge } from '@/components/DueBadge'
import type { Responsibility } from '@/lib/responsibilities'
import { describeRule } from '@/ruleEngine'

type ResponsibilityRowProps = {
  item: Responsibility
  timezone: string
  onDone: (item: Responsibility) => void
  /** Omit to hide edit/delete (e.g. on the to-do list) */
  onEdit?: (item: Responsibility) => void
  onDelete?: (item: Responsibility) => void
  /** Ring the row, e.g. when opened from a notification */
  highlighted?: boolean
}

export function ResponsibilityRow({ item, timezone, onDone, onEdit, onDelete, highlighted }: ResponsibilityRowProps) {
  return (
    <Card size="sm" id={`reminder-${item.id}`} className={highlighted ? "ring-2 ring-gold" : undefined}>
      <CardContent className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {describeRule(item.rule)} · {item.category}
            {item.owner_id === null && <Badge variant="outline">Shared</Badge>}
          </p>
          <div className="mt-1.5">
            <DueBadge due={item.next_due} timezone={timezone} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {item.status === 'active' && (
            <Button size="icon" variant="outline" aria-label={`Mark ${item.title} done`} onClick={() => onDone(item)}>
              <Check />
            </Button>
          )}
          {onEdit && (
            <Button size="icon" variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}>
              <Pencil />
            </Button>
          )}
          {onDelete && (
            <Button size="icon" variant="ghost" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}>
              <Trash2 />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
