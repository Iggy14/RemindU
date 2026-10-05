import { getDaysInMonth } from 'date-fns'
import { formatDate, parseDate, shiftDays, shiftUnits } from '../ruleEngine/dates'
import type { DateString } from '../ruleEngine/types'
import type { DateSpec } from './schema'

/**
 * `upcoming`: the date is in the future or today (deadlines, due dates).
 * `recent`: the date is today or in the past (when something was last done).
 */
export type DateDirection = 'upcoming' | 'recent'

const isInt = (n: number | null): n is number => n !== null && Number.isInteger(n)

/** Turn the model's date parts into a calendar date, or null if they don't describe one. */
export function resolveDate(spec: DateSpec | null, today: DateString, direction: DateDirection): DateString | null {
  if (!spec) return null
  try {
    return resolve(spec, today, direction)
  } catch {
    return null // impossible dates like Feb 30
  }
}

function resolve(spec: DateSpec, today: DateString, direction: DateDirection): DateString | null {
  if (isInt(spec.inAmount) && spec.inUnit) {
    const { inAmount: n, inUnit: unit } = spec
    return unit === 'day' ? shiftDays(today, n) : unit === 'week' ? shiftDays(today, n * 7) : shiftUnits(today, unit, n)
  }

  if (!isInt(spec.day)) return null
  const { day } = spec
  const now = parseDate(today)

  if (isInt(spec.month)) {
    if (isInt(spec.year)) return exact(spec.year, spec.month, day)
    const thisYear = exact(now.getFullYear(), spec.month, day)
    if (direction === 'upcoming' && thisYear < today) return exact(now.getFullYear() + 1, spec.month, day)
    if (direction === 'recent' && thisYear > today) return exact(now.getFullYear() - 1, spec.month, day)
    return thisYear
  }

  // Day of month only ("the 5th"): pick the nearest such day in the right direction, clamping to month-end.
  const inMonth = (offset: number) => {
    const first = parseDate(shiftUnits(`${today.slice(0, 8)}01`, 'month', offset))
    return exact(first.getFullYear(), first.getMonth() + 1, Math.min(day, getDaysInMonth(first)))
  }
  if (day < 1 || day > 31) return null
  const candidate = inMonth(0)
  if (direction === 'upcoming' && candidate < today) return inMonth(1)
  if (direction === 'recent' && candidate > today) return inMonth(-1)
  return candidate
}

/** Strict year/month/day -> date; throws if it isn't a real date. */
function exact(year: number, month: number, day: number): DateString {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return formatDate(parseDate(value))
}
