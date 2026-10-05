import { computeNextDue } from './computeNextDue'
import { expandOffsets } from './expandOffsets'
import { todayIn } from './dates'
import type { Offset, ReminderFire, Rule } from './types'

export { computeNextDue, dueStatus } from './computeNextDue'
export { expandOffsets, latestMissedFire } from './expandOffsets'
export { daysUntil, todayIn } from './dates'
export { advanceAfterDone } from './advanceAfterDone'
export { describeRule } from './describeRule'
export type * from './types'

/** Everything the scheduler needs for one responsibility: next due date plus its pending fire times. */
export function planReminders(rule: Rule, offsets: Offset[], timeZone: string, now: Date = new Date()) {
  const due = computeNextDue(rule, todayIn(timeZone, now))
  const fires: ReminderFire[] = expandOffsets(due, offsets, timeZone, now)
  return { due, fires }
}
