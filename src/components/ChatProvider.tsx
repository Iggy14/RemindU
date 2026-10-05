import type { ReactNode } from 'react'
import { useReminderChat } from '@/hooks/useReminderChat'
import { useResponsibilities } from '@/hooks/useResponsibilities'
import { ChatContext } from '@/lib/chat-context'

/** Lives above the tabs so the conversation survives switching between them. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { timezone, create, update } = useResponsibilities()
  const chat = useReminderChat({ timezone, create, update })
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>
}
