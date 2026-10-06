import type { DateString } from '../ruleEngine/types.js'
import { applyEdit } from './applyEdit.js'
import type { Draft } from './draft.js'
import { interpret, type Interpretation } from './interpret.js'
import type { AiMessage } from './schema.js'

/** One of the user's existing reminders, as the model sees it (by `number`) and as the server maps it back (by `id`). */
export type ChatItem = {
  number: number
  id: string
  draft: Draft
  nextDue: DateString | null
}

export type ChatReply =
  | Interpretation
  | { status: 'edit_ready'; targetId: string; before: Draft; draft: Draft }
  | { status: 'answer'; text: string }

const NOT_SURE = 'Sorry, I am not sure about that. I can add reminders, change existing ones, or tell you what is coming up.'

/** Decide what a model-extracted message means and produce the reply for the app. */
export function routeMessage(ai: AiMessage, items: ChatItem[], today: DateString): ChatReply {
  switch (ai.intent) {
    case 'add':
      return interpret(ai, today)
    case 'edit': {
      const item = items.find((i) => i.number === ai.targetNumber)
      if (!item) {
        return {
          status: 'needs_info',
          question: ai.followUpQuestion?.trim() || 'Which reminder do you mean?',
          missing: [],
        }
      }
      const result = applyEdit(ai, item.draft, today)
      return result.status === 'ready' ? { status: 'edit_ready', targetId: item.id, before: item.draft, draft: result.draft } : result
    }
    case 'ask':
      return { status: 'answer', text: ai.answer?.trim() || NOT_SURE }
  }
}
