import { lazy, Suspense } from 'react'
import { Bell, CheckSquare, MessageCircle, Settings as SettingsIcon } from 'lucide-react'
import { ChatProvider } from '@/components/ChatProvider'
import { TabBar, type TabItem } from '@/components/TabBar'
import { navigate, useNotificationNavigation, useRoute } from '@/lib/router'
import { pathFor, type TabId } from '@/lib/routes'
import { Todo } from '@/pages/Todo'

// Only the home tab ships in the main bundle; the others load on first visit.
const Chat = lazy(() => import('@/pages/Chat').then((m) => ({ default: m.Chat })))
const Reminders = lazy(() => import('@/pages/Reminders').then((m) => ({ default: m.Reminders })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))

const TABS: TabItem<TabId>[] = [
  { id: 'todo', label: 'To-do', icon: CheckSquare },
  { id: 'chat', label: 'AI chat', icon: MessageCircle },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

const PAGES: Record<TabId, React.ComponentType> = {
  todo: Todo,
  chat: Chat,
  reminders: Reminders,
  settings: Settings,
}

export function AppShell() {
  const { tab } = useRoute()
  useNotificationNavigation()
  const Page = PAGES[tab]

  return (
    <ChatProvider>
      <div className="isolate min-h-dvh bg-background text-foreground">
        <main className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-28">
          <Suspense fallback={null}>
            <Page />
          </Suspense>
        </main>
        <TabBar tabs={TABS} active={tab} onChange={(id) => navigate(pathFor(id))} />
      </div>
    </ChatProvider>
  )
}
