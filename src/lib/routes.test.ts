import { describe, expect, it } from 'vitest'
import { parseRoute, pathFor } from './routes'

describe('parseRoute', () => {
  it('maps each tab path', () => {
    expect(parseRoute('/')).toEqual({ tab: 'todo', reminderId: null })
    expect(parseRoute('/chat')).toEqual({ tab: 'chat', reminderId: null })
    expect(parseRoute('/reminders')).toEqual({ tab: 'reminders', reminderId: null })
    expect(parseRoute('/settings')).toEqual({ tab: 'settings', reminderId: null })
  })

  it('reads a reminder id and ignores a trailing slash', () => {
    expect(parseRoute('/reminders/abc-123')).toEqual({ tab: 'reminders', reminderId: 'abc-123' })
    expect(parseRoute('/reminders/')).toEqual({ tab: 'reminders', reminderId: null })
  })

  it('falls back to the home tab for unknown paths', () => {
    expect(parseRoute('/nope')).toEqual({ tab: 'todo', reminderId: null })
    expect(parseRoute('/chat/extra')).toEqual({ tab: 'chat', reminderId: null })
  })
})

describe('pathFor', () => {
  it('round-trips with parseRoute', () => {
    expect(pathFor('todo')).toBe('/')
    expect(pathFor('reminders', 'r1')).toBe('/reminders/r1')
    expect(parseRoute(pathFor('reminders', 'r1')).reminderId).toBe('r1')
    expect(pathFor('chat', 'ignored')).toBe('/chat')
  })
})
