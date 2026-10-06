import { ResponsibilityRow } from '@/components/ResponsibilityRow'
import type { Section } from '@/lib/groupReminders'
import type { Responsibility } from '@/lib/responsibilities'

type ReminderSectionsProps = {
  sections: Section[]
  timezone: string
  onDone: (item: Responsibility) => void
  onEdit: (item: Responsibility) => void
  onDelete: (item: Responsibility) => void
  highlightId?: string | null
}

export function ReminderSections({ sections, timezone, onDone, onEdit, onDelete, highlightId }: ReminderSectionsProps) {
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <section key={section.key} aria-label={section.title}>
          <h2
            className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
              section.key === 'overdue' ? 'text-destructive' : 'text-gold'
            }`}
          >
            {section.title}
            <span className="font-normal normal-case tracking-normal">{section.items.length}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => (
              <ResponsibilityRow
                key={item.id}
                item={item}
                timezone={timezone}
                onDone={onDone}
                onEdit={onEdit}
                onDelete={onDelete}
                highlighted={item.id === highlightId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
