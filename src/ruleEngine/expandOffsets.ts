import { shiftDays, zonedToUtc } from './dates.js'
import type { DateString, Offset, ReminderFire } from './types.js'

/**
 * Turn a due date into UTC fire times, one per offset, sorted earliest first.
 * Wall-clock time is interpreted in `timeZone`, so DST changes don't shift reminders.
 * Fires already in the past (before `now`) are dropped, unless `includePast` is set.
 */
export function expandOffsets(
  due: DateString,
  offsets: Offset[],
  timeZone: string,
  now: Date,
  includePast = false,
): ReminderFire[] {
  return offsets
    .map((offset) => {
      if (!Number.isInteger(offset.offsetDays) || offset.offsetDays < 0) {
        throw new Error('offsetDays must be a non-negative integer')
      }
      return {
        offset,
        dueDate: due,
        fireAt: zonedToUtc(shiftDays(due, -offset.offsetDays), offset.timeOfDay, timeZone),
      }
    })
    .filter((fire) => includePast || fire.fireAt.getTime() >= now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
}

/**
 * The reminder slot that was already missed when the item was saved (e.g. created at 10:00 for a
 * 09:00 "1 day before" slot, or already overdue), so it can be sent right away instead of never.
 * Only the latest missed slot is returned: older ones would just be noise.
 */
export function latestMissedFire(due: DateString, offsets: Offset[], timeZone: string, now: Date): ReminderFire | null {
  const missed = expandOffsets(due, offsets, timeZone, now, true).filter((fire) => fire.fireAt.getTime() < now.getTime())
  return missed.at(-1) ?? null
}
