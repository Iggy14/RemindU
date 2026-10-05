import { describe, expect, it } from 'vitest'
import { groupReminders } from '@/lib/groupReminders'
import type { Responsibility } from '@/lib/responsibilities'

const make = (id: string, next_due: string | null, status: Responsibility['status'] = 'active'): Responsibility => ({
  id,
  group_id: 'g',
  owner_id: 'u',
  title: id,
  category: 'bill',
  rule: { type: 'once', date: '2026-01-01' },
  status,
  next_due,
  offsets: [],
})

describe('groupReminders', () => {
  it('buckets by urgency and drops empty sections', () => {
    const sections = groupReminders(
      [make('a', '2026-10-01'), make('b', '2026-10-08'), make('c', '2026-12-01'), make('d', null, 'done')],
      '2026-10-05',
    )
    expect(sections.map((s) => [s.key, s.items.map((i) => i.id)])).toEqual([
      ['overdue', ['a']],
      ['week', ['b']],
      ['later', ['c']],
      ['done', ['d']],
    ])
  })
})
