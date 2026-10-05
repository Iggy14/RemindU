import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RuleFields } from '@/components/RuleFields'
import { draftFromRule, emptyRuleDraft, toRule, type RuleDraft } from '@/lib/ruleDraft'
import { CATEGORIES, type Category, type Responsibility, type ResponsibilityInput } from '@/lib/responsibilities'

const CATEGORY_ITEMS = CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))
const OFFSET_CHOICES = [30, 14, 7, 3, 1, 0]
const DEFAULT_OFFSETS = [7, 1]
const TIME_OF_DAY = '09:00'

type ResponsibilityFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The item being edited, or null to add a new one */
  item: Responsibility | null
  onSubmit: (input: ResponsibilityInput) => Promise<void>
}

export function ResponsibilityForm({ open, onOpenChange, item, onSubmit }: ResponsibilityFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item ? 'Edit reminder' : 'New reminder'}</SheetTitle>
          <SheetDescription>Due dates and reminder times are worked out for you.</SheetDescription>
        </SheetHeader>
        {/* key remounts the form with fresh state each time it opens or switches item */}
        <FormBody key={item?.id ?? 'new'} item={item} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

type FormBodyProps = {
  item: Responsibility | null
  onSubmit: (input: ResponsibilityInput) => Promise<void>
  onDone: () => void
}

function FormBody({ item, onSubmit, onDone }: FormBodyProps) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [category, setCategory] = useState<Category>(item?.category ?? 'custom')
  const [shared, setShared] = useState(item ? item.owner_id === null : false)
  const [draft, setDraft] = useState<RuleDraft>(item ? draftFromRule(item.rule) : emptyRuleDraft())
  const [offsetDays, setOffsetDays] = useState<string[]>(
    (item ? item.offsets.map((o) => o.offsetDays) : DEFAULT_OFFSETS).map(String),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const rule = toRule(draft)
    if (typeof rule === 'string') return setError(rule)
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        category,
        shared,
        rule,
        offsets: offsetDays.map((d) => ({ offsetDays: Number(d), timeOfDay: TIME_OF_DAY })),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="px-4 pb-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">What do you need to remember?</FieldLabel>
          <Input id="title" required maxLength={200} placeholder="Passport renewal" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field>
          <FieldLabel>Category</FieldLabel>
          <Select items={CATEGORY_ITEMS} value={category} onValueChange={(v) => v && setCategory(v as Category)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CATEGORY_ITEMS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Who sees it</FieldLabel>
          <ToggleGroup
            variant="outline"
            value={[shared ? 'shared' : 'personal']}
            onValueChange={(v) => v.length > 0 && setShared(v[0] === 'shared')}
          >
            <ToggleGroupItem value="personal">Just me</ToggleGroupItem>
            <ToggleGroupItem value="shared">Shared</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <RuleFields draft={draft} onChange={setDraft} />

        <Field>
          <FieldLabel>Remind me (days before, at 9:00)</FieldLabel>
          <ToggleGroup multiple variant="outline" value={offsetDays} onValueChange={setOffsetDays}>
            {OFFSET_CHOICES.map((d) => (
              <ToggleGroupItem key={d} value={String(d)}>
                {d === 0 ? 'On the day' : `${d}d`}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" disabled={busy}>
          {item ? 'Save changes' : 'Add reminder'}
        </Button>
      </FieldGroup>
    </form>
  )
}
