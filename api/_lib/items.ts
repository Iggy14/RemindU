import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category } from '../../src/ai/draft.js'
import type { ChatItem } from '../../src/ai/route.js'
import type { Rule } from '../../src/ruleEngine/types.js'

type Row = {
  id: string
  owner_id: string | null
  title: string
  category: Category
  rule: Rule
  next_due: string | null
  reminder_offsets: { offset_days: number; time_of_day: string }[]
}

const MAX_ITEMS = 100

/** The caller's active reminders (row-level security hides other people's private ones), numbered for the model. */
export async function fetchChatItems(db: SupabaseClient): Promise<ChatItem[]> {
  const { data, error } = await db
    .from('responsibilities')
    .select('id, owner_id, title, category, rule, next_due, reminder_offsets(offset_days, time_of_day)')
    .eq('status', 'active')
    .order('next_due', { ascending: true, nullsFirst: false })
    .limit(MAX_ITEMS)
  if (error) throw error

  return (data as unknown as Row[]).map((row, index) => ({
    number: index + 1,
    id: row.id,
    nextDue: row.next_due,
    draft: {
      title: row.title,
      category: row.category,
      shared: row.owner_id === null,
      rule: row.rule,
      offsets: row.reminder_offsets.map((o) => ({ offsetDays: o.offset_days, timeOfDay: o.time_of_day.slice(0, 5) })),
    },
  }))
}
