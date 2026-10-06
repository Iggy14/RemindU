import { computeNextDue } from './computeNextDue.js'
import { expandOffsets } from './expandOffsets.js'
import { todayIn } from './dates.js'
import type { Offset, ReminderFire, Rule } from './types.js'

export { computeNextDue, dueStatus } from './computeNextDue.js'
export { expandOffsets, latestMissedFire } from './expandOffsets.js'
export { daysUntil, todayIn } from './dates.js'
export { advanceAfterDone } from './advanceAfterDone.js'
export { describeRule } from './describeRule.js'
export type * from './types.js'

/** Everything the scheduler needs for one responsibility: next due date plus its pending fire times. */
export function planReminders(rule: Rule, offsets: Offset[], timeZone: string, now: Date = new Date()) {
  const due = computeNextDue(rule, todayIn(timeZone, now))
  const fires: ReminderFire[] = expandOffsets(due, offsets, timeZone, now)
  return { due, fires }
}
