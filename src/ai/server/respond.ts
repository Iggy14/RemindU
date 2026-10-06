import { generateText, Output } from 'ai'
import type { DateString } from '../../ruleEngine/types.js'
import type { ChatTurn } from '../draft.js'
import { routeMessage, type ChatItem, type ChatReply } from '../route.js'
import { aiMessageSchema } from '../schema.js'
import { getModel } from './model.js'
import { buildSystemPrompt } from './prompt.js'

/** Fail fast: a slow or overloaded Gemini should surface as "try again" in seconds, not hang for minutes. */
const MODEL_TIMEOUT_MS = 20_000
const MODEL_MAX_RETRIES = 1

/** One chat message (with the conversation so far) -> a new draft, an edit, an answer, or a follow-up question. */
export async function respond(messages: ChatTurn[], today: DateString, timezone: string, items: ChatItem[]): Promise<ChatReply> {
  const started = Date.now()
  try {
    const { output } = await generateText({
      model: getModel(),
      output: Output.object({ schema: aiMessageSchema, name: 'message' }),
      system: buildSystemPrompt(today, timezone, items),
      messages,
      temperature: 0,
      maxRetries: MODEL_MAX_RETRIES,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    })
    console.log(`Gemini call took ${Date.now() - started}ms`)
    return routeMessage(output, items, today)
  } catch (error) {
    console.error(`Gemini call failed after ${Date.now() - started}ms:`, error)
    throw error
  }
}
