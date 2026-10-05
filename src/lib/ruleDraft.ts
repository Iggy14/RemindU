import type { Rule } from '@/ruleEngine'

export type RuleType = Rule['type']

/** Raw form values for every rule type; `toRule` picks the ones the chosen type needs. */
export type RuleDraft = {
  type: RuleType
  date: string
  unit: 'month' | 'year'
  interval: string
  days: string
}

export function emptyRuleDraft(): RuleDraft {
  return { type: 'once', date: '', unit: 'month', interval: '1', days: '30' }
}

export function draftFromRule(rule: Rule): RuleDraft {
  const base = emptyRuleDraft()
  switch (rule.type) {
    case 'once':
      return { ...base, type: 'once', date: rule.date }
    case 'recurring':
      return { ...base, type: 'recurring', date: rule.anchor, unit: rule.unit, interval: String(rule.interval) }
    case 'after_previous':
      return { ...base, type: 'after_previous', date: rule.previous, days: String(rule.days) }
  }
}

/** Returns the rule, or an error message when the draft is incomplete. */
export function toRule(draft: RuleDraft): Rule | string {
  if (!draft.date) return 'Pick a date'
  switch (draft.type) {
    case 'once':
      return { type: 'once', date: draft.date }
    case 'recurring': {
      const interval = Number(draft.interval)
      if (!Number.isInteger(interval) || interval < 1) return 'Repeat interval must be a whole number of 1 or more'
      return { type: 'recurring', unit: draft.unit, interval, anchor: draft.date }
    }
    case 'after_previous': {
      const days = Number(draft.days)
      if (!Number.isInteger(days) || days < 1) return 'Days must be a whole number of 1 or more'
      return { type: 'after_previous', days, previous: draft.date }
    }
  }
}
