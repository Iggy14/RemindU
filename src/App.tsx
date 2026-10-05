import { useState } from 'react'
import { Bell, CheckSquare, MessageCircle, Settings as SettingsIcon } from 'lucide-react'
import { TabBar, type TabItem } from '@/components/TabBar'
import { Chat } from '@/pages/Chat'
import { Reminders } from '@/pages/Reminders'
import { Settings } from '@/pages/Settings'
import { Todo } from '@/pages/Todo'

type TabId = 'todo' | 'chat' | 'reminders' | 'settings'

const TABS: TabItem<TabId>[] = [
  { id: 'todo', label: 'To-do', icon: CheckSquare },
  { id: 'chat', label: 'AI chat', icon: MessageCircle },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

const PAGES: Record<TabId, () => React.JSX.Element> = {
  todo: Todo,
  chat: Chat,
  reminders: Reminders,
  settings: Settings,
}

function App() {
  const [tab, setTab] = useState<TabId>('todo')
  const Page = PAGES[tab]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-24">
        <Page />
      </main>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  )
}

export default App
