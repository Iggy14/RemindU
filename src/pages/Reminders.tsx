import { useEffect, useMemo, useRef, useState } from 'react'
import { BellOff, Plus, Search, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ReminderSections } from '@/components/ReminderSections'
import { ResponsibilityForm } from '@/components/ResponsibilityForm'
import { useResponsibilities } from '@/hooks/useResponsibilities'
import { groupReminders } from '@/lib/groupReminders'
import { navigate, useRoute } from '@/lib/router'
import { CATEGORIES, type Category, type Responsibility } from '@/lib/responsibilities'
import { todayIn } from '@/ruleEngine'

type Space = 'personal' | 'shared'

export function Reminders() {
  const { items, error, actionError, timezone, create, update, remove, done } = useResponsibilities()
  const [space, setSpace] = useState<Space>('personal')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Responsibility | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const { reminderId } = useRoute()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const handledId = useRef<string | null>(null)

  // Deep link (/reminders/:id, e.g. from a notification): show the item's space, clear filters, scroll to it.
  useEffect(() => {
    if (!reminderId) {
      handledId.current = null
      return
    }
    if (items === null || handledId.current === reminderId) return
    handledId.current = reminderId
    const target = items.find((i) => i.id === reminderId)
    if (!target) {
      navigate('/reminders', { replace: true }) // deleted, or not visible to this user
      return
    }
    setSpace(target.owner_id === null ? 'shared' : 'personal')
    setQuery('')
    setCategory(null)
    setHighlightId(reminderId)
    requestAnimationFrame(() =>
      document.getElementById(`reminder-${reminderId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    )
  }, [reminderId, items])

  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), 4000)
    return () => clearTimeout(timer)
  }, [highlightId])

  const inSpace = useMemo(
    () => (items ?? []).filter((i) => (space === 'shared' ? i.owner_id === null : i.owner_id !== null)),
    [items, space],
  )
  const personalCount = (items ?? []).filter((i) => i.owner_id !== null).length
  const sharedCount = (items ?? []).length - personalCount

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inSpace.filter((i) => (!category || i.category === category) && (!q || i.title.toLowerCase().includes(q)))
  }, [inSpace, query, category])
  const sections = useMemo(() => groupReminders(filtered, todayIn(timezone)), [filtered, timezone])

  function openForm(item: Responsibility | null) {
    setEditing(item)
    setFormOpen(true)
  }

  function confirmDelete(item: Responsibility) {
    if (window.confirm(`Delete "${item.title}"?`)) remove(item.id)
  }

  function clearFilters() {
    setQuery('')
    setCategory(null)
  }

  return (
    <>
      <PageHeader title="Reminders" subtitle="Everything you're tracking" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <Tabs value={space} onValueChange={(v) => setSpace(v as Space)}>
          <TabsList>
            <TabsTrigger value="personal">Personal ({personalCount})</TabsTrigger>
            <TabsTrigger value="shared">Shared ({sharedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => openForm(null)}>
          <Plus /> Add
        </Button>
      </div>

      {inSpace.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reminders"
              aria-label="Search reminders"
              className="pl-8"
            />
          </div>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={category ? [category] : []}
            onValueChange={(v) => setCategory((v[0] as Category | undefined) ?? null)}
            className="max-w-full overflow-x-auto"
            aria-label="Filter by category"
          >
            {CATEGORIES.map((c) => (
              <ToggleGroupItem key={c} value={c} className="capitalize">
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {(error || actionError) && <p className="mb-3 text-sm text-destructive">{error ?? actionError}</p>}
      {items === null && !error && <p className="text-muted-foreground">Loading…</p>}
      {items !== null && inSpace.length === 0 && (
        <EmptyState
          icon={BellOff}
          title={space === 'shared' ? 'Nothing shared yet' : 'No personal reminders yet'}
          hint={
            space === 'shared'
              ? 'Shared reminders show up for everyone in your group.'
              : 'Add a bill, subscription or deadline and we will remind you.'
          }
          action={
            <Button onClick={() => openForm(null)}>
              <Plus /> Add reminder
            </Button>
          }
        />
      )}
      {items !== null && inSpace.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No matches"
          hint="Try a different search or category."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}
      <ReminderSections
        sections={sections}
        timezone={timezone}
        onDone={done}
        onEdit={openForm}
        onDelete={confirmDelete}
        highlightId={highlightId}
      />

      <ResponsibilityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        onSubmit={(input) => (editing ? update(editing.id, input) : create(input))}
      />
    </>
  )
}
