import { describe, expect, it } from 'vitest'
import { buildPayload } from './pushPayload.js'

describe('buildPayload', () => {
  it('words the due date relative to the recipient', () => {
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-06', '2026-10-05').body).toBe('Rent is due tomorrow')
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-12', '2026-10-05').body).toBe('Rent is due in 7 days')
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-05', '2026-10-05').body).toBe('Rent is due today')
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-03', '2026-10-05').body).toBe('Rent is overdue by 2 days')
  })

  it('uses the event id as the tag so a repeat replaces instead of stacking', () => {
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-06', '2026-10-05').tag).toBe('e1')
  })
})

describe('buildPayload url', () => {
  it('deep-links to the reminder', () => {
    expect(buildPayload('e1', 'r1', 'Rent', '2026-10-06', '2026-10-05').url).toBe('/reminders/r1')
  })
})
