export type TabId = 'todo' | 'chat' | 'reminders' | 'settings'

export type Route = { tab: TabId; reminderId: string | null }

const TAB_PATHS: Record<TabId, string> = {
  todo: '/',
  chat: '/chat',
  reminders: '/reminders',
  settings: '/settings',
}

/** URL -> screen. Unknown paths fall back to the home tab. `/reminders/:id` points at one reminder. */
export function parseRoute(pathname: string): Route {
  const [first, id] = pathname.split('/').filter(Boolean)
  if (first === 'reminders') return { tab: 'reminders', reminderId: id ?? null }
  const tab = (Object.keys(TAB_PATHS) as TabId[]).find((t) => TAB_PATHS[t] === `/${first ?? ''}`)
  return { tab: tab ?? 'todo', reminderId: null }
}

export function pathFor(tab: TabId, reminderId?: string): string {
  return tab === 'reminders' && reminderId ? `${TAB_PATHS.reminders}/${reminderId}` : TAB_PATHS[tab]
}
