import { z } from 'zod'
import { respond } from '../../src/ai/server/respond.js'
import { todayIn } from '../../src/ruleEngine/dates.js'
import { getCaller } from '../_lib/auth.js'
import { fetchChatItems } from '../_lib/items.js'
import { allowRequest } from '../_lib/rateLimit.js'

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(1000) }))
    .min(1)
    .max(10),
  timezone: z.string().max(64),
})

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * POST /api/ai/chat: one chat message in, one reply out. The reply is a new draft, an edit to an
 * existing reminder, a follow-up question, or a plain answer. Nothing is saved here: the app saves
 * only after the user confirms.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await getCaller(request)
  if (!caller) return json({ error: 'Please sign in again.' }, 401)
  if (!allowRequest(caller.userId)) return json({ error: 'Too many requests. Wait a minute and try again.' }, 429)

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return json({ error: 'Invalid request.' }, 400)

  let today: string
  try {
    today = todayIn(body.data.timezone)
  } catch {
    return json({ error: 'Invalid timezone.' }, 400)
  }

  try {
    const items = await fetchChatItems(caller.db)
    return json(await respond(body.data.messages, today, body.data.timezone, items))
  } catch (error) {
    console.error('AI chat failed:', error)
    return json({ error: 'The AI could not process that. Please try again.' }, 502)
  }
}
