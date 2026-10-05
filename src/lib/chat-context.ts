import { createContext, useContext } from 'react'
import type { ReminderChat } from '@/hooks/useReminderChat'

export const ChatContext = createContext<ReminderChat | null>(null)

export function useChat(): ReminderChat {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}
