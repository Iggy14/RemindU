import { describe, expect, it } from 'vitest'
import { computeNextDue, dueStatus, expandOffsets, latestMissedFire, planReminders, todayIn } from './index.js'
import type { Rule } from './types.js'

const monthly = (anchor: string, interval = 1): Rule => ({ type: 'recurring', unit: 'month', interval, anchor })
const yearly = (anchor: string): Rule => ({ type: 'recurring', unit: 'year', interval: 1, anchor })

describe('computeNextDue: once', () => {
  it('returns the date, even when it has passed (overdue)', () => {
    expect(computeNextDue({ type: 'once', date: '2026-01-20' }, '2026-03-01')).toBe('2026-01-20')
  })
  it('rejects impossible dates', () => {
    expect(() => computeNextDue({ type: 'once', date: '2026-02-30' }, '2026-03-01')).toThrow()
  })
})

describe('computeNextDue: recurring monthly', () => {
  it('returns today when today is a due day', () => {
    expect(computeNextDue(monthly('2026-01-15'), '2026-03-15')).toBe('2026-03-15')
  })
  it('rolls to next month after the day has passed', () => {
    expect(computeNextDue(monthly('2026-01-15'), '2026-03-16')).toBe('2026-04-15')
  })
  it('returns the anchor when it is in the future', () => {
    expect(computeNextDue(monthly('2026-06-10'), '2026-03-01')).toBe('2026-06-10')
  })
  it('clamps month-end without drifting (Jan 31 anchor)', () => {
    const rule = monthly('2026-01-31')
    expect(computeNextDue(rule, '2026-02-01')).toBe('2026-02-28')
    expect(computeNextDue(rule, '2026-03-01')).toBe('2026-03-31')
    expect(computeNextDue(rule, '2026-04-01')).toBe('2026-04-30')
  })
  it('clamps to Feb 29 in a leap year', () => {
    expect(computeNextDue(monthly('2027-12-31'), '2028-02-01')).toBe('2028-02-29')
  })
  it('supports multi-month intervals (quarterly)', () => {
    expect(computeNextDue(monthly('2026-01-15', 3), '2026-02-01')).toBe('2026-04-15')
  })
})

describe('computeNextDue: recurring yearly', () => {
  it('rolls to next year after the date passes', () => {
    expect(computeNextDue(yearly('2024-06-01'), '2026-06-02')).toBe('2027-06-01')
  })
  it('Feb 29 anchor falls on Feb 28 in non-leap years and Feb 29 in leap years', () => {
    expect(computeNextDue(yearly('2024-02-29'), '2025-01-01')).toBe('2025-02-28')
    expect(computeNextDue(yearly('2024-02-29'), '2027-03-01')).toBe('2028-02-29')
  })
})

describe('computeNextDue: after_previous', () => {
  it('adds N days to the previous date', () => {
    expect(computeNextDue({ type: 'after_previous', days: 90, previous: '2026-01-01' }, '2026-02-01')).toBe('2026-04-01')
  })
  it('crosses a leap day', () => {
    expect(computeNextDue({ type: 'after_previous', days: 365, previous: '2027-03-01' }, '2027-03-01')).toBe('2028-02-29')
  })
  it('can be overdue', () => {
    expect(computeNextDue({ type: 'after_previous', days: 30, previous: '2026-01-01' }, '2026-06-01')).toBe('2026-01-31')
  })
  it('rejects non-positive days', () => {
    expect(() => computeNextDue({ type: 'after_previous', days: 0, previous: '2026-01-01' }, '2026-01-01')).toThrow()
  })
})

describe('dueStatus', () => {
  it('classifies overdue / today / upcoming', () => {
    expect(dueStatus('2026-03-01', '2026-03-02')).toBe('overdue')
    expect(dueStatus('2026-03-02', '2026-03-02')).toBe('today')
    expect(dueStatus('2026-03-03', '2026-03-02')).toBe('upcoming')
  })
})

describe('expandOffsets', () => {
  const early = new Date('2026-01-01T00:00:00Z')
  const offsets = [
    { offsetDays: 1, timeOfDay: '09:00' },
    { offsetDays: 30, timeOfDay: '09:00' },
    { offsetDays: 7, timeOfDay: '09:00' },
  ]

  it('returns UTC fire times sorted earliest first (Bangkok, UTC+7)', () => {
    const fires = expandOffsets('2026-03-31', offsets, 'Asia/Bangkok', early)
    expect(fires.map((f) => f.fireAt.toISOString())).toEqual([
      '2026-03-01T02:00:00.000Z',
      '2026-03-24T02:00:00.000Z',
      '2026-03-30T02:00:00.000Z',
    ])
  })

  it('keeps 09:00 local across the London spring-forward (Mar 29 2026)', () => {
    const fires = expandOffsets('2026-03-31', [{ offsetDays: 3, timeOfDay: '09:00' }, { offsetDays: 0, timeOfDay: '09:00' }], 'Europe/London', early)
    expect(fires.map((f) => f.fireAt.toISOString())).toEqual([
      '2026-03-28T09:00:00.000Z', // GMT
      '2026-03-31T08:00:00.000Z', // BST
    ])
  })

  it('keeps 09:00 local across the New York fall-back (Nov 1 2026)', () => {
    const fires = expandOffsets('2026-11-02', [{ offsetDays: 3, timeOfDay: '09:00' }, { offsetDays: 0, timeOfDay: '09:00' }], 'America/New_York', early)
    expect(fires.map((f) => f.fireAt.toISOString())).toEqual([
      '2026-10-30T13:00:00.000Z', // EDT
      '2026-11-02T14:00:00.000Z', // EST
    ])
  })

  it('drops fires already in the past unless includePast is set', () => {
    const now = new Date('2026-03-25T00:00:00Z')
    expect(expandOffsets('2026-03-31', offsets, 'Asia/Bangkok', now)).toHaveLength(1)
    expect(expandOffsets('2026-03-31', offsets, 'Asia/Bangkok', now, true)).toHaveLength(3)
  })

  it('rejects bad offsets and times', () => {
    expect(() => expandOffsets('2026-03-31', [{ offsetDays: -1, timeOfDay: '09:00' }], 'UTC', early)).toThrow()
    expect(() => expandOffsets('2026-03-31', [{ offsetDays: 1, timeOfDay: '9am' }], 'UTC', early)).toThrow()
  })
})

describe('todayIn / planReminders', () => {
  it('uses the group timezone for the calendar date', () => {
    const instant = new Date('2026-03-01T20:00:00Z') // already Mar 2 in Bangkok
    expect(todayIn('Asia/Bangkok', instant)).toBe('2026-03-02')
    expect(todayIn('UTC', instant)).toBe('2026-03-01')
  })

  it('plans the next due date and its pending fires', () => {
    const now = new Date('2026-03-16T00:00:00Z')
    const plan = planReminders(monthly('2026-01-15'), [{ offsetDays: 1, timeOfDay: '09:00' }], 'UTC', now)
    expect(plan.due).toBe('2026-04-15')
    expect(plan.fires[0].fireAt.toISOString()).toBe('2026-04-14T09:00:00.000Z')
  })
})

describe('daysUntil', () => {
  it('counts calendar days, negative when overdue', async () => {
    const { daysUntil } = await import('./index')
    expect(daysUntil('2026-03-10', '2026-03-01')).toBe(9)
    expect(daysUntil('2026-03-01', '2026-03-01')).toBe(0)
    expect(daysUntil('2026-02-27', '2026-03-01')).toBe(-2)
  })
})

describe('latestMissedFire', () => {
  const offsets = [
    { offsetDays: 7, timeOfDay: '09:00' },
    { offsetDays: 1, timeOfDay: '09:00' },
  ]

  it('returns the latest slot that has already passed', () => {
    // Bangkok, 10:00 on Mar 30: the 1-day-before slot (Mar 30 09:00) was missed, the 7-day one is older
    const now = new Date('2026-03-30T03:00:00Z')
    expect(latestMissedFire('2026-03-31', offsets, 'Asia/Bangkok', now)?.offset.offsetDays).toBe(1)
  })

  it('returns null when nothing has been missed', () => {
    expect(latestMissedFire('2026-03-31', offsets, 'Asia/Bangkok', new Date('2026-03-01T00:00:00Z'))).toBeNull()
  })

  it('catches up an overdue item with its closest-to-due slot', () => {
    const now = new Date('2026-04-10T00:00:00Z')
    expect(latestMissedFire('2026-03-31', offsets, 'Asia/Bangkok', now)?.offset.offsetDays).toBe(1)
  })
})
