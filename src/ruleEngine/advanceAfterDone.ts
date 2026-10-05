import { computeNextDue } from './computeNextDue'
import { shiftDays } from './dates'
import type { DateString, Rule } from './types'

export type Advanced = {
  rule: Rule
  /** The new due date, or null when the responsibility is finished for good. */
  nextDue: DateString | null
}

/**
 * What happens to a rule when its current occurrence is marked done on `today`.
 * - once: finished.
 * - recurring: move on to the occurrence after the one just completed (not "next from today",
 *   so finishing a bill a week early doesn't skip it or double up).
 * - after_previous: the clock restarts from today.
 */
export function advanceAfterDone(rule: Rule, currentDue: DateString, today: DateString): Advanced {
  switch (rule.type) {
    case 'once':
      return { rule, nextDue: null }
    case 'recurring':
      return { rule, nextDue: computeNextDue(rule, shiftDays(currentDue, 1)) }
    case 'after_previous': {
      const restarted: Rule = { ...rule, previous: today }
      return { rule: restarted, nextDue: computeNextDue(restarted, today) }
    }
  }
}
