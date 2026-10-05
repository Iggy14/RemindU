import type { Responsibility } from '@/lib/responsibilities'
import { daysUntil, type DateString } from '@/ruleEngine'

export type Section = { key: 'overdue' | 'week' | 'later' | 'done'; title: string; items: Responsibility[] }

const TITLES: Record<Section['key'], string> = {
  overdue: 'Overdue',
  week: 'Next 7 days',
  later: 'Later',
  done: 'Completed',
}

/** Split reminders into urgency buckets (input order is kept, empty buckets are dropped). */
export function groupReminders(items: Responsibility[], today: DateString): Section[] {
  const buckets: Record<Section['key'], Responsibility[]> = { overdue: [], week: [], later: [], done: [] }
  for (const item of items) {
    if (item.status !== 'active' || !item.next_due) buckets.done.push(item)
    else {
      const days = daysUntil(item.next_due, today)
      buckets[days < 0 ? 'overdue' : days <= 7 ? 'week' : 'later'].push(item)
    }
  }
  return (Object.keys(buckets) as Section['key'][])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, title: TITLES[key], items: buckets[key] }))
}
