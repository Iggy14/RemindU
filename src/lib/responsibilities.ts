import { advanceAfterDone, computeNextDue, expandOffsets, latestMissedFire, todayIn, type DateString, type Offset, type ReminderFire, type Rule } from '@/ruleEngine'
import { supabase } from '@/lib/supabase'

import { CATEGORIES, type Category, type Draft } from '@/ai/draft'

export { CATEGORIES }
export type { Category }

export type Responsibility = {
  id: string
  group_id: string
  /** null = shared with the whole group; otherwise private to this user */
  owner_id: string | null
  title: string
  category: Category
  rule: Rule
  status: 'active' | 'done' | 'archived'
  next_due: DateString | null
  offsets: Offset[]
}

/** Fields the user edits (the same shape the AI parser produces). */
export type ResponsibilityInput = Draft

type Row = Omit<Responsibility, 'offsets'> & {
  reminder_offsets: { offset_days: number; time_of_day: string }[]
}

const SELECT = '*, reminder_offsets(offset_days, time_of_day)'

export async function fetchResponsibilities(): Promise<Responsibility[]> {
  const { data, error } = await supabase
    .from('responsibilities')
    .select(SELECT)
    .neq('status', 'archived')
    .order('next_due', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data as unknown as Row[]).map(({ reminder_offsets, ...rest }) => ({
    ...rest,
    offsets: reminder_offsets.map((o) => ({ offsetDays: o.offset_days, timeOfDay: o.time_of_day.slice(0, 5) })),
  }))
}

type Context = { groupId: string; userId: string; timezone: string }

export async function createResponsibility(ctx: Context, input: ResponsibilityInput): Promise<void> {
  const nextDue = computeNextDue(input.rule, todayIn(ctx.timezone))
  const { data, error } = await supabase
    .from('responsibilities')
    .insert({
      group_id: ctx.groupId,
      owner_id: input.shared ? null : ctx.userId,
      created_by: ctx.userId,
      title: input.title,
      category: input.category,
      rule: input.rule,
      next_due: nextDue,
    })
    .select('id')
    .single()
  if (error) throw error
  await syncSchedule(data.id, nextDue, input.offsets, ctx.timezone)
}

export async function updateResponsibility(ctx: Context, id: string, input: ResponsibilityInput): Promise<void> {
  const nextDue = computeNextDue(input.rule, todayIn(ctx.timezone))
  const { error } = await supabase
    .from('responsibilities')
    .update({
      owner_id: input.shared ? null : ctx.userId,
      title: input.title,
      category: input.category,
      rule: input.rule,
      next_due: nextDue,
      status: 'active',
    })
    .eq('id', id)
  if (error) throw error
  await syncSchedule(id, nextDue, input.offsets, ctx.timezone)
}

export async function deleteResponsibility(id: string): Promise<void> {
  const { error } = await supabase.from('responsibilities').delete().eq('id', id)
  if (error) throw error
}

/** Complete the current occurrence; the rule engine decides what comes next. */
export async function markDone(item: Responsibility, timezone: string): Promise<void> {
  if (!item.next_due) return
  const { rule, nextDue } = advanceAfterDone(item.rule, item.next_due, todayIn(timezone))

  const { error: doneError } = await supabase
    .from('reminder_events')
    .update({ done_at: new Date().toISOString() })
    .eq('responsibility_id', item.id)
    .eq('due_date', item.next_due)
  if (doneError) throw doneError

  const { error } = await supabase
    .from('responsibilities')
    .update({ rule, next_due: nextDue, status: nextDue ? 'active' : 'done' })
    .eq('id', item.id)
  if (error) throw error

  await syncSchedule(item.id, nextDue, nextDue ? item.offsets : [], timezone)
}

/**
 * Replace a responsibility's offsets and its not-yet-sent events so they match `due`.
 * Events that were already sent are kept as history.
 */
async function syncSchedule(id: string, due: DateString | null, offsets: Offset[], timezone: string): Promise<void> {
  const { error: eventsError } = await supabase.from('reminder_events').delete().eq('responsibility_id', id).is('sent_at', null)
  if (eventsError) throw eventsError
  const { error: offsetsError } = await supabase.from('reminder_offsets').delete().eq('responsibility_id', id)
  if (offsetsError) throw offsetsError
  if (!due || offsets.length === 0) return

  const { data: saved, error } = await supabase
    .from('reminder_offsets')
    .insert(offsets.map((o) => ({ responsibility_id: id, offset_days: o.offsetDays, time_of_day: o.timeOfDay })))
    .select('id, offset_days, time_of_day')
  if (error) throw error

  const offsetId = new Map(saved.map((o) => [`${o.offset_days}|${o.time_of_day.slice(0, 5)}`, o.id]))
  const now = new Date()
  const toEvent = (fire: ReminderFire, fireAt: Date) => ({
    responsibility_id: id,
    offset_id: offsetId.get(`${fire.offset.offsetDays}|${fire.offset.timeOfDay}`) ?? null,
    due_date: fire.dueDate,
    fire_at: fireAt.toISOString(),
  })
  const events = expandOffsets(due, offsets, timezone, now).map((fire) => toEvent(fire, fire.fireAt))

  // A slot that was already missed (created late, or overdue) is sent at the next scheduler run,
  // unless this due date was already notified (edits re-run this function and must not re-fire it).
  const missed = latestMissedFire(due, offsets, timezone, now)
  if (missed) {
    const { count, error: sentError } = await supabase
      .from('reminder_events')
      .select('id', { count: 'exact', head: true })
      .eq('responsibility_id', id)
      .eq('due_date', due)
      .not('sent_at', 'is', null)
    if (sentError) throw sentError
    if (!count) events.push(toEvent(missed, now))
  }
  if (events.length === 0) return
  const { error: insertError } = await supabase.from('reminder_events').insert(events)
  if (insertError) throw insertError
}
