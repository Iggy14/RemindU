import type { Rule } from './types.js'

/** Short human description of a rule, e.g. "Every 3 months". */
export function describeRule(rule: Rule): string {
  switch (rule.type) {
    case 'once':
      return 'One time'
    case 'recurring': {
      const unit = rule.unit === 'month' ? 'month' : 'year'
      return rule.interval === 1 ? `Every ${unit}` : `Every ${rule.interval} ${unit}s`
    }
    case 'after_previous':
      return `${rule.days} days after last done`
  }
}
