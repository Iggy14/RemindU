import type { DateString, Offset, Rule } from '../ruleEngine/types'
import type { Draft } from './draft'
import { resolveDate } from './resolveDate'
import type { AiReminder } from './schema'

export type Interpretation =
  | { status: 'ready'; draft: Draft }
  | { status: 'needs_info'; question: string; missing: Missing[] }

export type Missing = 'title' | 'date' | 'frequency' | 'days'

const DEFAULT_OFFSET_DAYS = [7, 1]
const MAX_OFFSETS = 6
export const TIME_OF_DAY = '09:00'

export const FALLBACK_QUESTIONS: Record<Missing, string> = {
  title: 'What would you like to be reminded about?',
  date: 'What date is it due?',
  frequency: 'How often does it repeat (for example every month or every year)?',
  days: 'How many days after it was last done is it due again?',
}

export const isPositiveInt = (n: number | null): n is number => n !== null && Number.isInteger(n) && n >= 1

/** Build a brand-new rule from what the model extracted, or list what's missing. */
export function buildRule(ai: AiReminder, today: DateString): { rule: Rule | null; missing: Missing[] } {
  const missing: Missing[] = []
  // A date with no stated kind is a one-off deadline.
  const kind = ai.kind ?? 'once'

  if (kind === 'once') {
    const date = resolveDate(ai.date, today, 'upcoming')
    if (date) return { rule: { type: 'once', date }, missing }
    return { rule: null, missing: ['date'] }
  }

  if (kind === 'recurring') {
    const interval = ai.interval ?? 1
    if (!ai.unit || !isPositiveInt(interval)) missing.push('frequency')
    const anchor = resolveDate(ai.date, today, 'upcoming')
    if (!anchor) missing.push('date')
    if (ai.unit && isPositiveInt(interval) && anchor) return { rule: { type: 'recurring', unit: ai.unit, interval, anchor }, missing }
    return { rule: null, missing }
  }

  if (!isPositiveInt(ai.days)) missing.push('days')
  const previous = resolveDate(ai.date, today, 'recent')
  if (!previous) missing.push('date')
  if (isPositiveInt(ai.days) && previous) return { rule: { type: 'after_previous', days: ai.days, previous }, missing }
  return { rule: null, missing }
}

/** Valid "days before" values from the model (whole numbers 0-365, deduplicated), or null if none. */
export function parseOffsets(days: number[] | null): Offset[] | null {
  const valid = (days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 365)
  if (valid.length === 0) return null
  return [...new Set(valid)].slice(0, MAX_OFFSETS).map((offsetDays) => ({ offsetDays, timeOfDay: TIME_OF_DAY }))
}

export function defaultOffsets(): Offset[] {
  return DEFAULT_OFFSET_DAYS.map((offsetDays) => ({ offsetDays, timeOfDay: TIME_OF_DAY }))
}

/**
 * Validate what the model extracted and build a draft, or say what's still missing.
 * All date maths happens here (and in the rule engine), never in the model.
 */
export function interpret(ai: AiReminder, today: DateString): Interpretation {
  const title = ai.title?.trim().slice(0, 200) ?? ''
  const { rule, missing } = buildRule(ai, today)
  if (!title) missing.unshift('title')

  if (!rule || missing.length > 0) {
    const first = missing[0] ?? 'date'
    const question = ai.followUpQuestion?.trim() || FALLBACK_QUESTIONS[first]
    return { status: 'needs_info', question, missing: missing.length > 0 ? missing : [first] }
  }

  return {
    status: 'ready',
    draft: {
      title,
      category: ai.category ?? 'custom',
      shared: ai.shared ?? false,
      rule,
      offsets: parseOffsets(ai.reminderDaysBefore) ?? defaultOffsets(),
    },
  }
}
