import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabItem<Id extends string> = {
  id: Id
  label: string
  icon: LucideIcon
}

type TabBarProps<Id extends string> = {
  tabs: TabItem<Id>[]
  active: Id
  onChange: (id: Id) => void
}

export function TabBar<Id extends string>({ tabs, active, onChange }: TabBarProps<Id>) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ id, label, icon: Icon }) => (
          <li key={id} className="flex-1">
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-current={active === id ? 'page' : undefined}
              className={cn(
                'flex w-full flex-col items-center gap-1 py-2 text-xs',
                active === id ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
