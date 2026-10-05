import { createContext, useContext } from 'react'
import type { Group, Member } from '@/lib/groups'

export type GroupState = {
  group: Group
  members: Member[]
  /** IANA timezone used for due dates and reminder times */
  timezone: string
}

export const GroupContext = createContext<GroupState | null>(null)

export function useGroup(): GroupState {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used inside <GroupGate>')
  return ctx
}
