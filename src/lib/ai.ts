import type { ChatTurn } from '@/ai/draft'
import type { ChatReply } from '@/ai/route'
import { supabase } from '@/lib/supabase'

/** Send the conversation so far to the AI and get back a draft, an edit, a question or an answer. */
export async function sendChatMessage(messages: ChatTurn[], timezone: string): Promise<ChatReply> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again.')

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, timezone }),
  })
  const body = (await response.json().catch(() => null)) as (ChatReply & { error?: string }) | { error: string } | null
  if (!response.ok || !body || 'error' in body) {
    throw new Error((body && 'error' in body && body.error) || 'Something went wrong. Please try again.')
  }
  return body
}
