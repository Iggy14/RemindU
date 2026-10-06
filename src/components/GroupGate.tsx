import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { GroupSetup } from '@/components/GroupSetup'
import { ScreenMessage } from '@/components/ScreenMessage'
import { GroupContext, type GroupState } from '@/lib/group-context'
import { ensureTimezone, fetchMembers, fetchMyGroup } from '@/lib/groups'

type Loaded =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: Omit<GroupState, 'reload'> }

async function resolveGroup(userId: string): Promise<Loaded> {
  try {
    const group = await fetchMyGroup()
    if (!group) return { status: 'none' }
    const [members, timezone] = await Promise.all([fetchMembers(group.id), ensureTimezone(userId)])
    return { status: 'ready', value: { group, members, timezone } }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Could not load your space' }
  }
}

/** Renders children only once the signed-in user belongs to a group. */
export function GroupGate({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<Loaded>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    resolveGroup(userId).then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const reload = useCallback(async () => setState(await resolveGroup(userId)), [userId])

  switch (state.status) {
    case 'loading':
      return <ScreenMessage>Loading…</ScreenMessage>
    case 'error':
      return <ScreenMessage>{state.message}</ScreenMessage>
    case 'none':
      return <GroupSetup onDone={reload} />
    case 'ready':
      return <GroupContext.Provider value={{ ...state.value, reload }}>{children}</GroupContext.Provider>
  }
}
