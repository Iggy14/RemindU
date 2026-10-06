/** Calendar date as `YYYY-MM-DD`. Timezone-free; the group timezone only matters for fire times. */
export type DateString = string

export type RecurUnit = 'day' | 'week' | 'month' | 'year'

export type Rule =
  /** A single date: a deadline or an expiry. Stays due (overdue) until marked done. */
  | { type: 'once'; date: DateString }
  /** Repeats every `interval` days/weeks/months/years from `anchor`. Month-end days clamp (Jan 31 -> Feb 28/29). */
  | { type: 'recurring'; unit: RecurUnit; interval: number; anchor: DateString }
  /** Due `days` after the last time it was done ("renew 90 days after last service"). */
  | { type: 'after_previous'; days: number; previous: DateString }

/** A reminder N days before the due date, at a wall-clock time in the group timezone. */
export type Offset = {
  offsetDays: number
  /** `HH:mm`, 24h */
  timeOfDay: string
}

export type ReminderFire = {
  offset: Offset
  dueDate: DateString
  /** UTC instant to send the push */
  fireAt: Date
}

export type DueStatus = 'overdue' | 'today' | 'upcoming'
