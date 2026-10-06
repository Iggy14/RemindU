import { addDays, addMonths, addYears, format, parse } from 'date-fns'
import type { DateString } from './types.js'

const FORMAT = 'yyyy-MM-dd'

export function parseDate(value: DateString): Date {
  const date = parse(value, FORMAT, new Date(0))
  if (Number.isNaN(date.getTime()) || format(date, FORMAT) !== value) {
    throw new Error(`Invalid date: ${value}`)
  }
  return date
}

export function formatDate(date: Date): DateString {
  return format(date, FORMAT)
}

export function shiftDays(value: DateString, days: number): DateString {
  return formatDate(addDays(parseDate(value), days))
}

/** Add months/years to `value`, clamping to month-end (always computed from `value`, never chained). */
export function shiftUnits(value: DateString, unit: 'month' | 'year', amount: number): DateString {
  const start = parseDate(value)
  return formatDate(unit === 'month' ? addMonths(start, amount) : addYears(start, amount))
}

/** Today's calendar date in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): DateString {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** Convert a wall-clock date + `HH:mm` in `timeZone` to a UTC instant (DST-safe). */
export function zonedToUtc(date: DateString, timeOfDay: string, timeZone: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay)
  if (!match) throw new Error(`Invalid time of day: ${timeOfDay}`)
  parseDate(date)
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, Number(match[1]), Number(match[2]))
  // Offset at the guess may differ from the offset at the real instant across a DST change; refine once.
  const first = guess - offsetMs(guess, timeZone)
  return new Date(guess - offsetMs(first, timeZone))
}

/** Whole calendar days from `today` to `due` (negative = overdue). */
export function daysUntil(due: DateString, today: DateString): number {
  return Math.round((parseDate(due).getTime() - parseDate(today).getTime()) / 86_400_000)
}
