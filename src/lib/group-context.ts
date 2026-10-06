import { createContext, useContext } from 'react'
import type { Group, Member } from '@/lib/groups'

export type GroupState = {
  group: Group
  members: Member[]
  /** IANA timezone used for due dates and reminder times */
  timezone: string
  /** Re-fetch the group; call after leaving or joining */
  reload: () => Promise<void>
}

export const GroupContext = createContext<GroupState | null>(null)

export function useGroup(): GroupState {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used inside <GroupGate>')
  return ctx
}
