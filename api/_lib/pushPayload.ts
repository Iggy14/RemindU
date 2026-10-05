import { daysUntil } from '../../src/ruleEngine/dates'

export type PushPayload = { title: string; body: string; url: string; tag: string }

function when(days: number): string {
  if (days < 0) return `overdue by ${-days} day${days === -1 ? '' : 's'}`
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `due in ${days} days`
}

/** What a recipient sees. `today` is the recipient's own calendar date, so "tomorrow" is right for them. */
export function buildPayload(eventId: string, title: string, dueDate: string, today: string): PushPayload {
  return { title, body: `${title} is ${when(daysUntil(dueDate, today))}`, url: '/', tag: eventId }
}
