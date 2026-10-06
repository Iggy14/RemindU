import { describe, expect, it } from 'vitest'
import { advanceAfterDone } from './index.js'

describe('advanceAfterDone', () => {
  it('once: finished', () => {
    expect(advanceAfterDone({ type: 'once', date: '2026-03-01' }, '2026-03-01', '2026-03-01').nextDue).toBeNull()
  })

  it('recurring: moves to the occurrence after the one completed', () => {
    const rule = { type: 'recurring', unit: 'month', interval: 1, anchor: '2026-01-15' } as const
    expect(advanceAfterDone(rule, '2026-03-15', '2026-03-15').nextDue).toBe('2026-04-15')
  })

  it('recurring: finishing early does not skip or repeat an occurrence', () => {
    const rule = { type: 'recurring', unit: 'month', interval: 1, anchor: '2026-01-15' } as const
    expect(advanceAfterDone(rule, '2026-03-15', '2026-03-08').nextDue).toBe('2026-04-15')
  })

  it('recurring: finishing very late still lands on the next real occurrence', () => {
    const rule = { type: 'recurring', unit: 'month', interval: 1, anchor: '2026-01-31' } as const
    expect(advanceAfterDone(rule, '2026-02-28', '2026-03-20').nextDue).toBe('2026-03-31')
  })

  it('after_previous: restarts the clock from the day it was done', () => {
    const rule = { type: 'after_previous', days: 90, previous: '2026-01-01' } as const
    const result = advanceAfterDone(rule, '2026-04-01', '2026-04-10')
    expect(result.nextDue).toBe('2026-07-09')
    expect(result.rule).toEqual({ type: 'after_previous', days: 90, previous: '2026-04-10' })
  })
})
