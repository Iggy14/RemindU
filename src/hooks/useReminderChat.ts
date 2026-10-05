import { useCallback, useState } from 'react'
import type { ChatTurn, Draft } from '@/ai/draft'
import type { ChatReply } from '@/ai/route'
import { sendChatMessage } from '@/lib/ai'
import { computeNextDue, describeRule, todayIn } from '@/ruleEngine'

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** A reminder the assistant proposes (new, or the edited version); shown as a confirm card */
  draft?: Draft
  /** Set when the draft changes an existing reminder */
  edit?: { targetId: string; before: Draft }
  /** 'saved' or 'discarded' once the user has answered the card */
  outcome?: 'saved' | 'discarded'
}

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: 'Tell me what you need to remember, change one of your reminders, or ask what is coming up. For example: "Netflix is 15 on the 5th every month".',
}

type ChatDeps = {
  timezone: string
  create: (draft: Draft) => Promise<void>
  update: (id: string, draft: Draft) => Promise<void>
}

/** The server accepts at most this many turns, and the first must be from the user. */
const MAX_TURNS = 10

function trimThread(turns: ChatTurn[]): ChatTurn[] {
  const recent = turns.slice(-MAX_TURNS)
  const firstUser = recent.findIndex((t) => t.role === 'user')
  return recent.slice(Math.max(firstUser, 0))
}

function summarise(draft: Draft, timezone: string): string {
  const due = computeNextDue(draft.rule, todayIn(timezone))
  return `${draft.title}: ${describeRule(draft.rule).toLowerCase()}, next due ${due}.`
}

/**
 * The AI chat conversation. `thread` is what the AI sees (reset after each saved/discarded card);
 * `messages` is what the screen shows. Saving only ever happens from `confirm`, after the user taps Save.
 */
export function useReminderChat({ timezone, create, update }: ChatDeps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [thread, setThread] = useState<ChatTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const append = useCallback((message: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...message, id: prev.length }])
  }, [])

  const showReply = useCallback(
    (reply: ChatReply, history: ChatTurn[]) => {
      /** Show an assistant message and remember what it said, so follow-ups have context. */
      const say = (text: string, extra: Partial<ChatMessage> = {}, remembered = text) => {
        setThread([...history, { role: 'assistant', content: remembered }])
        append({ role: 'assistant', text, ...extra })
      }

      switch (reply.status) {
        case 'needs_info':
          return say(reply.question)
        case 'answer':
          return say(reply.text)
        case 'ready':
          return say('Here is what I will set up. Look right?', { draft: reply.draft }, summarise(reply.draft, timezone))
        case 'edit_ready':
          return say(
            `Here is the change to "${reply.before.title}". Look right?`,
            { draft: reply.draft, edit: { targetId: reply.targetId, before: reply.before } },
            `Updated ${summarise(reply.draft, timezone)}`,
          )
      }
    },
    [append, timezone],
  )

  const send = useCallback(
    async (text: string) => {
      const next = trimThread([...thread, { role: 'user', content: text }])
      append({ role: 'user', text })
      setThread(next)
      setBusy(true)
      setError(null)
      try {
        showReply(await sendChatMessage(next, timezone), next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
      setBusy(false)
    },
    [thread, timezone, append, showReply],
  )

  const settle = useCallback((id: number, outcome: 'saved' | 'discarded') => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, outcome } : m)))
    setThread([])
  }, [])

  const confirm = useCallback(
    async (message: ChatMessage) => {
      if (!message.draft) return
      setBusy(true)
      setError(null)
      try {
        await (message.edit ? update(message.edit.targetId, message.draft) : create(message.draft))
        settle(message.id, 'saved')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save')
      }
      setBusy(false)
    },
    [create, update, settle],
  )

  const discard = useCallback((id: number) => settle(id, 'discarded'), [settle])

  return { messages, busy, error, send, confirm, discard, timezone }
}

export type ReminderChat = ReturnType<typeof useReminderChat>
