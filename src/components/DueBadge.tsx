import { Badge } from '@/components/ui/badge'
import { dueLabel } from '@/lib/dueLabel'
import { daysUntil, todayIn } from '@/ruleEngine'

export function DueBadge({ due, timezone }: { due: string | null; timezone: string }) {
  if (!due) return <Badge variant="secondary">Done</Badge>
  const days = daysUntil(due, todayIn(timezone))
  return <Badge variant={days < 0 ? 'destructive' : days <= 7 ? 'default' : 'secondary'}>{dueLabel(days)}</Badge>
}
