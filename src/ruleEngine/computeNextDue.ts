import { differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarYears } from 'date-fns'
import { parseDate, shiftDays, shiftUnits } from './dates.js'
import type { DateString, DueStatus, RecurUnit, Rule } from './types.js'

/**
 * The next due date for a rule, as seen on `today` (a calendar date in the group timezone).
 * `once` and `after_previous` can return a past date: that means overdue, not "no next date".
 * `recurring` always returns today or later.
 */
export function computeNextDue(rule: Rule, today: DateString): DateString {
  switch (rule.type) {
    case 'once':
      parseDate(rule.date)
      return rule.date
    case 'after_previous':
      assertPositiveInt(rule.days, 'days')
      return shiftDays(rule.previous, rule.days)
    case 'recurring':
      return nextOccurrence(rule, today)
  }
}

function nextOccurrence(rule: Extract<Rule, { type: 'recurring' }>, today: DateString): DateString {
  assertPositiveInt(rule.interval, 'interval')
  const anchor = parseDate(rule.anchor)
  const now = parseDate(today)
  const elapsed = elapsedUnits(rule.unit, now, anchor)
  let step = Math.max(0, Math.floor(elapsed / rule.interval))
  let candidate = shiftUnits(rule.anchor, rule.unit, step * rule.interval)
  while (candidate < today) {
    step += 1
    candidate = shiftUnits(rule.anchor, rule.unit, step * rule.interval)
  }
  return candidate
}

/** A lower bound on whole units from `anchor` to `now`; the loop above walks forward to the exact date. */
function elapsedUnits(unit: RecurUnit, now: Date, anchor: Date): number {
  switch (unit) {
    case 'day':
      return differenceInCalendarDays(now, anchor)
    case 'week':
      return Math.floor(differenceInCalendarDays(now, anchor) / 7)
    case 'month':
      return differenceInCalendarMonths(now, anchor)
    case 'year':
      return differenceInCalendarYears(now, anchor)
  }
}

export function dueStatus(due: DateString, today: DateString): DueStatus {
  if (due < today) return 'overdue'
  return due === today ? 'today' : 'upcoming'
}

function assertPositiveInt(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`)
}
