import type { DateString, Rule } from '../ruleEngine/types.js'
import type { Draft } from './draft.js'
import { buildRule, FALLBACK_QUESTIONS, isPositiveInt, parseOffsets, type Missing } from './interpret.js'
import { resolveDate } from './resolveDate.js'
import type { AiReminder } from './schema.js'

export type EditResult =
  | { status: 'ready'; draft: Draft }
  | { status: 'needs_info'; question: string; missing: Missing[] }

/**
 * Apply an edit request to an existing reminder. The model's fields mean "the new value";
 * anything it left null stays as it is. Dates are resolved here, never by the model.
 */
export function applyEdit(ai: AiReminder, current: Draft, today: DateString): EditResult {
  const rule = mergeRule(ai, current.rule, today)
  if ('missing' in rule) return ask(ai, rule.missing)

  const title = ai.title?.trim().slice(0, 200) || current.title
  const draft: Draft = {
    title,
    category: ai.category ?? current.category,
    shared: ai.shared ?? current.shared,
    rule: rule.rule,
    offsets: parseOffsets(ai.reminderDaysBefore) ?? current.offsets,
  }

  if (JSON.stringify(draft) === JSON.stringify(current)) {
    return {
      status: 'needs_info',
      question: ai.followUpQuestion?.trim() || `What would you like to change about "${current.title}"?`,
      missing: [],
    }
  }
  return { status: 'ready', draft }
}

function ask(ai: AiReminder, missing: Missing[]): EditResult {
  return { status: 'needs_info', question: ai.followUpQuestion?.trim() || FALLBACK_QUESTIONS[missing[0]], missing }
}

function mergeRule(ai: AiReminder, current: Rule, today: DateString): { rule: Rule } | { missing: Missing[] } {
  // Switching to a different kind of rule needs a full description, like a new reminder.
  if (ai.kind && ai.kind !== current.type) {
    const built = buildRule(ai, today)
    return built.rule ? { rule: built.rule } : { missing: built.missing }
  }

  // the model may send a date object with every field null: that means "no date"
  const dateGiven = ai.date !== null && Object.values(ai.date).some((v) => v !== null)
  switch (current.type) {
    case 'once': {
      if (!dateGiven) return { rule: current }
      const date = resolveDate(ai.date, today, 'upcoming')
      return date ? { rule: { type: 'once', date } } : { missing: ['date'] }
    }
    case 'recurring': {
      const unit = ai.unit ?? current.unit
      // "make it yearly" with no count means every 1 year, not "keep the old count"
      const interval = ai.interval ?? (ai.unit && ai.unit !== current.unit ? 1 : current.interval)
      if (!isPositiveInt(interval)) return { missing: ['frequency'] }
      let anchor = current.anchor
      if (dateGiven) {
        const resolved = resolveDate(ai.date, today, 'upcoming')
        if (!resolved) return { missing: ['date'] }
        anchor = resolved
      }
      return { rule: { type: 'recurring', unit, interval, anchor } }
    }
    case 'after_previous': {
      const days = ai.days ?? current.days
      if (!isPositiveInt(days)) return { missing: ['days'] }
      let previous = current.previous
      if (dateGiven) {
        const resolved = resolveDate(ai.date, today, 'recent')
        if (!resolved) return { missing: ['date'] }
        previous = resolved
      }
      return { rule: { type: 'after_previous', days, previous } }
    }
  }
}
