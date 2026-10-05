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

/** Floating icon-only pill: a tight row of round buttons, the active one filled. */
export function TabBar<Id extends string>({ tabs, active, onChange }: TabBarProps<Id>) {
  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <ul className="pointer-events-auto flex gap-1 rounded-full border bg-background/85 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur-xl">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex size-12 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
