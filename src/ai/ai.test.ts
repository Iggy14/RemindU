import { describe, expect, it } from 'vitest'
import { interpret } from './interpret.js'
import { resolveDate } from './resolveDate.js'
import type { AiReminder, DateSpec } from './schema.js'

const spec = (parts: Partial<DateSpec>): DateSpec => ({
  year: null,
  month: null,
  day: null,
  inAmount: null,
  inUnit: null,
  ...parts,
})

const ai = (parts: Partial<AiReminder>): AiReminder => ({
  title: 'Test',
  category: null,
  shared: null,
  kind: null,
  date: null,
  unit: null,
  interval: null,
  days: null,
  reminderDaysBefore: null,
  followUpQuestion: null,
  ...parts,
})

const TODAY = '2026-03-10'

describe('resolveDate', () => {
  it('uses an explicit full date', () => {
    expect(resolveDate(spec({ year: 2028, month: 1, day: 20 }), TODAY, 'upcoming')).toBe('2028-01-20')
  })
  it('month+day without a year: next occurrence (upcoming)', () => {
    expect(resolveDate(spec({ month: 1, day: 20 }), TODAY, 'upcoming')).toBe('2027-01-20')
    expect(resolveDate(spec({ month: 12, day: 25 }), TODAY, 'upcoming')).toBe('2026-12-25')
    expect(resolveDate(spec({ month: 3, day: 10 }), TODAY, 'upcoming')).toBe('2026-03-10')
  })
  it('month+day without a year: most recent occurrence (recent)', () => {
    expect(resolveDate(spec({ month: 12, day: 25 }), TODAY, 'recent')).toBe('2025-12-25')
  })
  it('day of month only: next such day', () => {
    expect(resolveDate(spec({ day: 15 }), TODAY, 'upcoming')).toBe('2026-03-15')
    expect(resolveDate(spec({ day: 5 }), TODAY, 'upcoming')).toBe('2026-04-05')
  })
  it('day of month only: clamps to month-end', () => {
    expect(resolveDate(spec({ day: 31 }), '2026-02-10', 'upcoming')).toBe('2026-02-28')
  })
  it('relative dates', () => {
    expect(resolveDate(spec({ inAmount: 2, inUnit: 'week' }), TODAY, 'upcoming')).toBe('2026-03-24')
    expect(resolveDate(spec({ inAmount: 3, inUnit: 'month' }), TODAY, 'upcoming')).toBe('2026-06-10')
    expect(resolveDate(spec({ inAmount: -3, inUnit: 'month' }), TODAY, 'recent')).toBe('2025-12-10')
    expect(resolveDate(spec({ inAmount: 10, inUnit: 'day' }), TODAY, 'upcoming')).toBe('2026-03-20')
  })
  it('returns null for impossible or empty dates', () => {
    expect(resolveDate(spec({ month: 2, day: 30, year: 2026 }), TODAY, 'upcoming')).toBeNull()
    expect(resolveDate(spec({ month: 13, day: 1 }), TODAY, 'upcoming')).toBeNull()
    expect(resolveDate(spec({}), TODAY, 'upcoming')).toBeNull()
    expect(resolveDate(null, TODAY, 'upcoming')).toBeNull()
  })
})

describe('interpret', () => {
  it('builds a one-off draft; kind defaults to once when a date is given', () => {
    const result = interpret(ai({ title: 'Passport expiry', category: 'expiry', date: spec({ year: 2028, month: 1, day: 20 }) }), TODAY)
    expect(result).toEqual({
      status: 'ready',
      draft: {
        title: 'Passport expiry',
        category: 'expiry',
        shared: false,
        rule: { type: 'once', date: '2028-01-20' },
        offsets: [
          { offsetDays: 7, timeOfDay: '09:00' },
          { offsetDays: 1, timeOfDay: '09:00' },
        ],
      },
    })
  })

  it('builds a monthly recurring draft from just a day of month', () => {
    const result = interpret(ai({ title: 'Rent', kind: 'recurring', unit: 'month', interval: 1, date: spec({ day: 1 }), shared: true }), TODAY)
    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.draft.rule).toEqual({ type: 'recurring', unit: 'month', interval: 1, anchor: '2026-04-01' })
      expect(result.draft.shared).toBe(true)
    }
  })

  it('defaults interval to 1 when the model leaves it out', () => {
    const result = interpret(ai({ kind: 'recurring', unit: 'year', date: spec({ month: 6, day: 1 }) }), TODAY)
    expect(result.status === 'ready' && result.draft.rule).toEqual({ type: 'recurring', unit: 'year', interval: 1, anchor: '2026-06-01' })
  })

  it('builds an after_previous draft', () => {
    const result = interpret(ai({ kind: 'after_previous', days: 90, date: spec({ inAmount: -1, inUnit: 'month' }) }), TODAY)
    expect(result.status === 'ready' && result.draft.rule).toEqual({ type: 'after_previous', days: 90, previous: '2026-02-10' })
  })

  it('uses custom reminder offsets, dropping junk and duplicates', () => {
    const result = interpret(ai({ date: spec({ year: 2027, month: 1, day: 1 }), reminderDaysBefore: [30, 30, -1, 2.5, 7] }), TODAY)
    expect(result.status === 'ready' && result.draft.offsets.map((o) => o.offsetDays)).toEqual([30, 7])
  })

  it('asks for the date when none was given, preferring the model question', () => {
    const result = interpret(ai({ title: 'Dentist', followUpQuestion: 'When is the appointment?' }), TODAY)
    expect(result).toEqual({ status: 'needs_info', question: 'When is the appointment?', missing: ['date'] })
  })

  it('falls back to a built-in question when the model gave none', () => {
    const result = interpret(ai({ title: null, date: spec({ year: 2027, month: 1, day: 1 }) }), TODAY)
    expect(result).toEqual({ status: 'needs_info', question: 'What would you like to be reminded about?', missing: ['title'] })
  })

  it('asks about frequency for a recurring item without a unit', () => {
    const result = interpret(ai({ kind: 'recurring', date: spec({ day: 5 }) }), TODAY)
    expect(result.status).toBe('needs_info')
    if (result.status === 'needs_info') expect(result.missing).toEqual(['frequency'])
  })

  it('ignores a model follow-up question when nothing is actually missing', () => {
    const result = interpret(ai({ date: spec({ year: 2027, month: 1, day: 1 }), followUpQuestion: 'Anything else?' }), TODAY)
    expect(result.status).toBe('ready')
  })

  it('treats an impossible date as missing', () => {
    const result = interpret(ai({ date: spec({ year: 2026, month: 2, day: 30 }) }), TODAY)
    expect(result.status).toBe('needs_info')
  })
})
