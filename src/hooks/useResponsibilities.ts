import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useGroup } from '@/lib/group-context'
import {
  createResponsibility,
  deleteResponsibility,
  fetchResponsibilities,
  markDone,
  updateResponsibility,
  type Responsibility,
  type ResponsibilityInput,
} from '@/lib/responsibilities'

/** Loads the signed-in user's visible responsibilities and exposes the mutations. Each one reloads the list. */
export function useResponsibilities() {
  const { session } = useAuth()
  const { group, timezone } = useGroup()
  const userId = session!.user.id
  const [items, setItems] = useState<Responsibility[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchResponsibilities().then(
      (next) => {
        if (cancelled) return
        setItems(next)
        setError(null)
      },
      (e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load reminders')
      },
    )
    return () => {
      cancelled = true
    }
  }, [version])

  const run = useCallback(async (action: () => Promise<void>) => {
    await action()
    setVersion((v) => v + 1)
  }, [])

  /** For actions with no form to show an error in: records the failure in `actionError`. */
  const guarded = useCallback(
    async (action: () => Promise<void>) => {
      setActionError(null)
      try {
        await run(action)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Something went wrong')
      }
    },
    [run],
  )

  const ctx = { groupId: group.id, userId, timezone }

  return {
    items,
    error,
    actionError,
    userId,
    timezone,
    create: (input: ResponsibilityInput) => run(() => createResponsibility(ctx, input)),
    update: (id: string, input: ResponsibilityInput) => run(() => updateResponsibility(ctx, id, input)),
    remove: (id: string) => guarded(() => deleteResponsibility(id)),
    done: (item: Responsibility) => guarded(() => markDone(item, timezone)),
  }
}
