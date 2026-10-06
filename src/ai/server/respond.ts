import { generateText, Output } from 'ai'
import type { DateString } from '../../ruleEngine/types.js'
import type { ChatTurn } from '../draft.js'
import { routeMessage, type ChatItem, type ChatReply } from '../route.js'
import { aiMessageSchema } from '../schema.js'
import { getModel } from './model.js'
import { buildSystemPrompt } from './prompt.js'

/** One chat message (with the conversation so far) -> a new draft, an edit, an answer, or a follow-up question. */
export async function respond(messages: ChatTurn[], today: DateString, timezone: string, items: ChatItem[]): Promise<ChatReply> {
  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: aiMessageSchema, name: 'message' }),
    system: buildSystemPrompt(today, timezone, items),
    messages,
    temperature: 0,
  })
  return routeMessage(output, items, today)
}
