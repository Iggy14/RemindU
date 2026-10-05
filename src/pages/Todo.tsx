import { HomeHero } from '@/components/HomeHero'
import { ResponsibilityRow } from '@/components/ResponsibilityRow'
import { useResponsibilities } from '@/hooks/useResponsibilities'
import { useGroup } from '@/lib/group-context'
import { daysUntil, todayIn } from '@/ruleEngine'

/** Anything due within this many days (or already overdue) shows up here. */
const ATTENTION_WINDOW_DAYS = 7

function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function Todo() {
  const { items, error, actionError, userId, timezone, done } = useResponsibilities()
  const { members } = useGroup()
  const name = members.find((m) => m.user_id === userId)?.display_name

  const today = todayIn(timezone)
  const needsAttention = (items ?? []).filter(
    (i) => i.status === 'active' && i.next_due && daysUntil(i.next_due, today) <= ATTENTION_WINDOW_DAYS,
  )

  return (
    <>
      <HomeHero
        title={name ? `${greeting()}, ${name}` : greeting()}
        subtitle="Things that need your attention"
        name={name}
      />
      {(error || actionError) && <p className="mb-3 text-sm text-destructive">{error ?? actionError}</p>}
      {items === null && !error && <p className="text-muted-foreground">Loading…</p>}
      {items !== null && needsAttention.length === 0 && (
        <p className="text-muted-foreground">You&apos;re all caught up. Nothing is due in the next {ATTENTION_WINDOW_DAYS} days.</p>
      )}
      <div className="flex flex-col gap-2">
        {needsAttention.map((item) => (
          <ResponsibilityRow key={item.id} item={item} timezone={timezone} onDone={done} />
        ))}
      </div>
    </>
  )
}
