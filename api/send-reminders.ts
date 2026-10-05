import { timingSafeEqual } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { todayIn } from '../src/ruleEngine/dates'
import { buildPayload } from './_lib/pushPayload'

const BATCH = 100

type EventRow = {
  id: string
  due_date: string
  responsibilities: { group_id: string; owner_id: string | null; title: string; status: string }
}
type Subscription = { id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string } }

const json = (body: unknown, status = 200) => Response.json(body, { status })

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!secret || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Everyone who should hear about an item: its owner if private, otherwise the whole group. */
async function recipientsOf(db: SupabaseClient, item: EventRow['responsibilities']): Promise<string[]> {
  if (item.owner_id) return [item.owner_id]
  const { data, error } = await db.from('group_members').select('user_id').eq('group_id', item.group_id)
  if (error) throw error
  return data.map((m) => m.user_id)
}

/**
 * POST /api/send-reminders: called by pg_cron every ~10 minutes with `Authorization: Bearer $CRON_SECRET`.
 * Uses the service role (bypasses RLS) to find reminders whose time has come and push them to every
 * device of each recipient. Each event is claimed (sent_at set) before sending, so overlapping runs
 * never double-send. Delivery is best-effort: a claimed event is not retried.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401)

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    console.error('send-reminders: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY')
    return json({ error: 'Server is not configured.' }, 500)
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', vapidPublic, vapidPrivate)
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const { data: due, error } = await db
      .from('reminder_events')
      .select('id, due_date, responsibilities!inner(group_id, owner_id, title, status)')
      .is('sent_at', null)
      .is('done_at', null)
      .lte('fire_at', new Date().toISOString())
      .eq('responsibilities.status', 'active')
      .order('fire_at', { ascending: true })
      .limit(BATCH)
    if (error) throw error
    if (due.length === 0) return json({ claimed: 0, sent: 0 })

    const { data: claimedRows, error: claimError } = await db
      .from('reminder_events')
      .update({ sent_at: new Date().toISOString() })
      .in('id', due.map((e) => e.id))
      .is('sent_at', null)
      .select('id')
    if (claimError) throw claimError
    const claimed = new Set(claimedRows.map((r) => r.id))
    const events = (due as unknown as EventRow[]).filter((e) => claimed.has(e.id))

    const recipients = new Map(await Promise.all(events.map(async (e) => [e.id, await recipientsOf(db, e.responsibilities)] as const)))
    const userIds = [...new Set([...recipients.values()].flat())]
    if (userIds.length === 0) return json({ claimed: events.length, sent: 0 })

    const [{ data: subs, error: subsError }, { data: profiles, error: profilesError }] = await Promise.all([
      db.from('push_subscriptions').select('id, user_id, endpoint, keys').in('user_id', userIds),
      db.from('profiles').select('id, timezone').in('id', userIds),
    ])
    if (subsError) throw subsError
    if (profilesError) throw profilesError
    const timezone = new Map(profiles.map((p) => [p.id, p.timezone]))

    let sent = 0
    const gone: string[] = []
    const sends = events.flatMap((event) =>
      (subs as Subscription[])
        .filter((s) => recipients.get(event.id)?.includes(s.user_id))
        .map(async (sub) => {
          const today = todayIn(timezone.get(sub.user_id) ?? 'UTC')
          const payload = buildPayload(event.id, event.responsibilities.title, event.due_date, today)
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload))
            sent++
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) gone.push(sub.id) // the device unsubscribed or was uninstalled
            else console.error('send-reminders: push failed', status, err)
          }
        }),
    )
    await Promise.all(sends)
    if (gone.length > 0) await db.from('push_subscriptions').delete().in('id', gone)

    return json({ claimed: events.length, sent, removed: gone.length })
  } catch (error) {
    console.error('send-reminders failed:', error)
    return json({ error: 'Failed to send reminders.' }, 500)
  }
}
