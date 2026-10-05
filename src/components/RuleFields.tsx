import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type RuleDraft, type RuleType } from '@/lib/ruleDraft'

const RULE_TYPES = [
  { value: 'once', label: 'One time (deadline or expiry)' },
  { value: 'recurring', label: 'Repeats (bill, subscription)' },
  { value: 'after_previous', label: 'Some days after last done' },
]

const UNITS = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
]

type RuleFieldsProps = {
  draft: RuleDraft
  onChange: (draft: RuleDraft) => void
}

export function RuleFields({ draft, onChange }: RuleFieldsProps) {
  const set = (patch: Partial<RuleDraft>) => onChange({ ...draft, ...patch })
  const dateLabel = { once: 'Due date', recurring: 'A due date (first or recent)', after_previous: 'Last done on' }[draft.type]

  return (
    <>
      <Field>
        <FieldLabel>How often</FieldLabel>
        <Select items={RULE_TYPES} value={draft.type} onValueChange={(v) => v && set({ type: v as RuleType })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {RULE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {draft.type === 'recurring' && (
        <div className="flex gap-2">
          <Field>
            <FieldLabel htmlFor="interval">Every</FieldLabel>
            <Input id="interval" type="number" min={1} value={draft.interval} onChange={(e) => set({ interval: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>Unit</FieldLabel>
            <Select items={UNITS} value={draft.unit} onValueChange={(v) => v && set({ unit: v as 'month' | 'year' })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {draft.type === 'after_previous' && (
        <Field>
          <FieldLabel htmlFor="days">Due again after (days)</FieldLabel>
          <Input id="days" type="number" min={1} value={draft.days} onChange={(e) => set({ days: e.target.value })} />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="date">{dateLabel}</FieldLabel>
        <Input id="date" type="date" required value={draft.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
    </>
  )
}
