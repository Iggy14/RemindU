import { describe, expect, it } from 'vitest'
import { applyEdit } from './applyEdit.js'
import type { Draft } from './draft.js'
import { routeMessage, type ChatItem } from './route.js'
import type { AiMessage, DateSpec } from './schema.js'

const TODAY = '2026-03-10'

const spec = (parts: Partial<DateSpec>): DateSpec => ({ year: null, month: null, day: null, inAmount: null, inUnit: null, ...parts })

const msg = (parts: Partial<AiMessage>): AiMessage => ({
  intent: 'edit',
  targetNumber: 1,
  answer: null,
  title: null,
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

const offsets = [{ offsetDays: 7, timeOfDay: '09:00' }]

const visa: Draft = { title: 'Visa', category: 'expiry', shared: false, rule: { type: 'once', date: '2027-01-10' }, offsets }
const netflix: Draft = {
  title: 'Netflix',
  category: 'subscription',
  shared: true,
  rule: { type: 'recurring', unit: 'month', interval: 1, anchor: '2026-01-05' },
  offsets,
}
const service: Draft = {
  title: 'Car service',
  category: 'custom',
  shared: false,
  rule: { type: 'after_previous', days: 180, previous: '2026-01-01' },
  offsets,
}

describe('applyEdit', () => {
  it('changes only the date of a one-off, keeping everything else', () => {
    const result = applyEdit(msg({ date: spec({ month: 1, day: 20 }) }), visa, TODAY)
    expect(result).toEqual({ status: 'ready', draft: { ...visa, rule: { type: 'once', date: '2027-01-20' } } })
  })

  it('changes the day of a monthly bill', () => {
    const result = applyEdit(msg({ date: spec({ day: 20 }) }), netflix, TODAY)
    expect(result.status === 'ready' && result.draft.rule).toEqual({ type: 'recurring', unit: 'month', interval: 1, anchor: '2026-03-20' })
  })

  it('switching a recurring item to yearly resets the interval to 1', () => {
    const quarterly: Draft = { ...netflix, rule: { type: 'recurring', unit: 'month', interval: 3, anchor: '2026-01-05' } }
    const result = applyEdit(msg({ unit: 'year' }), quarterly, TODAY)
    expect(result.status === 'ready' && result.draft.rule).toMatchObject({ unit: 'year', interval: 1 })
  })

  it('changes the interval of an after_previous rule', () => {
    const result = applyEdit(msg({ days: 90 }), service, TODAY)
    expect(result.status === 'ready' && result.draft.rule).toEqual({ type: 'after_previous', days: 90, previous: '2026-01-01' })
  })

  it('changes title, scope, category and reminders without touching the rule', () => {
    const result = applyEdit(msg({ title: 'Visa renewal', shared: true, category: 'deadline', reminderDaysBefore: [30, 7] }), visa, TODAY)
    expect(result).toEqual({
      status: 'ready',
      draft: {
        title: 'Visa renewal',
        category: 'deadline',
        shared: true,
        rule: visa.rule,
        offsets: [
          { offsetDays: 30, timeOfDay: '09:00' },
          { offsetDays: 7, timeOfDay: '09:00' },
        ],
      },
    })
  })

  it('ignores a date object whose fields are all null', () => {
    const result = applyEdit(msg({ date: spec({}), title: 'Visa 2' }), visa, TODAY)
    expect(result.status === 'ready' && result.draft.rule).toEqual(visa.rule)
  })

  it('changing the kind requires a full description', () => {
    const incomplete = applyEdit(msg({ kind: 'recurring' }), visa, TODAY)
    expect(incomplete.status).toBe('needs_info')
    const complete = applyEdit(msg({ kind: 'recurring', unit: 'year', interval: 1, date: spec({ month: 1, day: 10 }) }), visa, TODAY)
    expect(complete.status === 'ready' && complete.draft.rule).toEqual({ type: 'recurring', unit: 'year', interval: 1, anchor: '2027-01-10' })
  })

  it('asks what to change when nothing would change', () => {
    const result = applyEdit(msg({}), visa, TODAY)
    expect(result).toMatchObject({ status: 'needs_info', question: 'What would you like to change about "Visa"?' })
  })

  it('asks again when the new date cannot be resolved', () => {
    const result = applyEdit(msg({ date: spec({ year: 2026, month: 2, day: 30 }) }), visa, TODAY)
    expect(result.status).toBe('needs_info')
  })
})

describe('routeMessage', () => {
  const items: ChatItem[] = [
    { number: 1, id: 'id-visa', draft: visa, nextDue: '2027-01-10' },
    { number: 2, id: 'id-netflix', draft: netflix, nextDue: '2026-04-05' },
  ]

  it('add: builds a draft from the extracted fields', () => {
    const reply = routeMessage(msg({ intent: 'add', targetNumber: null, title: 'Gym', kind: 'recurring', unit: 'month', date: spec({ day: 1 }) }), items, TODAY)
    expect(reply.status).toBe('ready')
  })

  it('edit: maps the model number back to the real id', () => {
    const reply = routeMessage(msg({ targetNumber: 2, title: 'Netflix Premium' }), items, TODAY)
    expect(reply).toMatchObject({ status: 'edit_ready', targetId: 'id-netflix', before: netflix, draft: { title: 'Netflix Premium' } })
  })

  it('edit: an unknown or missing number asks which reminder', () => {
    expect(routeMessage(msg({ targetNumber: 99, title: 'x' }), items, TODAY)).toMatchObject({ status: 'needs_info', question: 'Which reminder do you mean?' })
    expect(routeMessage(msg({ targetNumber: null, followUpQuestion: 'Which one: Visa or Netflix?' }), items, TODAY)).toMatchObject({
      status: 'needs_info',
      question: 'Which one: Visa or Netflix?',
    })
  })

  it('ask: returns the answer, or a fallback when empty', () => {
    expect(routeMessage(msg({ intent: 'ask', answer: 'Netflix is due on 5 April.' }), items, TODAY)).toEqual({ status: 'answer', text: 'Netflix is due on 5 April.' })
    expect(routeMessage(msg({ intent: 'ask', answer: '  ' }), items, TODAY).status).toBe('answer')
  })
})
