# RemindU – Architecture

An AI life-admin PWA for two people (plus a shared space). The user describes a responsibility in natural language; the AI turns it into a structured rule; a deterministic rule engine computes the dates; the app tracks and notifies.

**Principle:** the AI extracts intent, code does the date maths. The AI never calculates dates.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vite + React + TypeScript | Mobile-first PWA via `vite-plugin-pwa` |
| Hosting | Vercel (Hobby) | Static app + serverless `/api` functions |
| AI | Vercel AI SDK (`ai`) | Structured output + tool calling + streaming. Model: free Gemini/Groq key, or AI Gateway. Kept swappable in one module |
| Auth + DB | Supabase | Auth, Postgres, Row Level Security |
| Scheduler | Supabase `pg_cron` | Calls `/api/send-reminders` every ~10 min (Vercel Hobby cron is once/day only). Fallback: cron-job.org / GitHub Actions |
| Push | Web Push (VAPID) via `web-push` | Works on iOS 16.4+ (Home Screen install only) and Android Chrome |
| Dates | `date-fns` (+ `rrule` if needed) | Pure, unit-tested `ruleEngine` |

## High-level flow

```
Phone PWA ──► /api/ai/chat ──► LLM (JSON rule) ──► validate (zod)
    │                                   │ missing fields? -> follow-up question
    ▼                                   ▼
 confirm card ──► Supabase (responsibility + offsets) ──► ruleEngine computes due dates
                                                            │
pg_cron (10 min) ──► /api/send-reminders ──► find due reminders ──► Web Push to all relevant members
```

## Modules

- `src/ruleEngine/` – pure functions: `computeNextDue(rule, now)`, `expandOffsets(due, offsets)`, handles month-end, leap years, "N days after previous", recurrence. No I/O, fully unit-tested.
- Rule shapes (`src/ruleEngine/types.ts`): `once` (deadline/expiry), `recurring` (every N months/years from an anchor; month-end clamps, computed from the anchor so it never drifts), `after_previous` (N days after the last time done). Dates are timezone-free `YYYY-MM-DD` strings; only `fire_at` is a UTC instant, converted from wall-clock time in the group timezone. `once`/`after_previous` may return a past date, which means overdue. New rule kinds: add a variant to `Rule`, handle it in `computeNextDue`, add tests, then extend the AI zod schema.
- `src/ai/schema.ts` – zod schema for what the AI may emit (title, category, scope, anchor date, recurrence, offsets, missing[]).
- `api/ai/chat.ts` – one endpoint for the AI chat tab: a message becomes a new draft, an edit to an existing reminder, a follow-up question, or an answer (see "AI pattern").
- `api/send-reminders.ts` – authenticated by a shared secret; queries due reminders, fans out pushes, marks them sent.
- `src/pages/` – `Todo`, `Chat`, `Reminders`, `Settings` (bottom tab bar).

## Data model (Postgres)

- `profiles` (id = auth.uid, display_name, timezone)
- `groups` (id, name, invite_code)
- `group_members` (group_id, user_id)
- `responsibilities` (id, group_id, owner_id NULL = shared, title, category, rule jsonb, anchor_date, status, created_at)
  - `owner_id` set -> private to that user; `owner_id` null -> Shared (visible to all group members)
- `reminder_offsets` (id, responsibility_id, offset_days, time_of_day)
- `reminder_events` (id, responsibility_id, offset_id, fire_at timestamptz, sent_at, done_at) – materialised by the rule engine so the scheduler is a simple query
- `push_subscriptions` (id, user_id, endpoint, keys jsonb, user_agent)

Categories: subscription, bill, expiry/document, deadline, custom.

## Auth and groups pattern

- Email + password via Supabase Auth. `AuthProvider` (session) -> `GroupGate` (user must belong to a group) -> `AppShell`. Components read `useAuth()` / `useGroup()`.
- Clients can **only read** `groups` and `group_members`. Creating and joining go through `security definer` RPCs (`create_group`, `join_group`). Do not add client insert policies for these tables.
- RLS policies that need membership use `is_group_member(gid)` / `shares_group_with(uid)` (security definer) to avoid policy recursion. Use them for new group-scoped tables.
- Migrations live in `supabase/migrations/`, numbered, and are run by hand in the Supabase SQL Editor.

## Reminders data flow

- `responsibilities.next_due` is the current due date, computed by the rule engine on create, edit and mark-done (`src/lib/responsibilities.ts`). Never compute dates anywhere else.
- Mark done = `advanceAfterDone(rule, currentDue, today)`: `once` finishes, `recurring` moves to the occurrence after the one completed, `after_previous` restarts from today.
- `syncSchedule` rewrites a responsibility's offsets and its unsent `reminder_events`; sent events stay as history.
- Missed slots: `expandOffsets` drops fire times already in the past, so `syncSchedule` adds one catch-up event (`latestMissedFire`, `fire_at = now`) for the latest missed slot, sent at the next scheduler run. It is skipped if that due date already has a sent event, so edits never re-fire it.
- Pages read data through `useResponsibilities()` (list + mutations). Add new queries to `src/lib/responsibilities.ts`, not inside components.

## AI pattern

- **One route, three intents.** `POST /api/ai/chat` makes a single model call per message. The model returns an `intent` (add / edit / ask) plus extracted fields; `src/ai/route.ts` (`routeMessage`) turns that into a reply: `ready` (new draft), `edit_ready` (targetId + before + after), `needs_info` (a question) or `answer`. The server fetches the caller's reminders itself with their token (RLS applies) and numbers them for the model; it maps `targetNumber` back to a real id, never trusting the model with ids. Nothing is saved server-side: the app saves after the user confirms the card.
- **The model extracts, code decides.** `src/ai/schema.ts` is what the model fills in: title/category/kind plus date *parts* ("20 Jan", "the 5th", "in 2 weeks"). It never emits a calendar date. `src/ai/resolveDate.ts` turns parts into dates, `src/ai/interpret.ts` validates, builds a `Draft` (or a follow-up question) and decides what is missing. Add new extractable fields there, with tests in `src/ai/ai.test.ts` / `route.test.ts`. Edits only change fields the model set (`applyEdit`); to add a new intent, extend `aiMessageSchema`, `routeMessage` and `ChatReply`, and the prompt in `src/ai/server/prompt.ts`.
- Routes live in `api/**` and export one function per HTTP method (`export async function POST(request: Request)`). Files or folders starting with `_` (`api/_lib`) are helpers, not routes. Every AI route must call `getUserId` and `allowRequest` first.
- `src/ai/server/` is server-only (reads `process.env`; excluded from the browser tsconfig). Everything else in `src/ai` and `src/ruleEngine` is shared with the browser, so use **relative imports** there, not `@/`.
- The provider is chosen only in `src/ai/server/model.ts` (`GEMINI_API_KEY`, optional `AI_MODEL`). Keys are server-only: no `VITE_` prefix.
- `npm run dev` serves `api/**` through `scripts/vite-api-plugin.ts`, loading the same files Vercel will deploy; no Vercel CLI needed.
- AI output is untrusted: the user always confirms a `DraftCard` before anything is saved.

## Security

- **RLS on every table.** A private responsibility is readable only by its owner; shared ones by group members. Never rely on UI hiding.
- AI/API keys and the VAPID private key live only in Vercel/Supabase env vars, never in the client.
- `/api/send-reminders` requires a secret header; AI routes require a valid Supabase session and per-user rate limiting.
- AI output is untrusted: always zod-validated and shown on a confirm card before saving.

## Notifications

- Everyone in the group is notified for their own private reminders **and** all shared reminders, regardless of which space they are viewing.
- Permission is requested from a button tap (required on iOS). Subscription stored per device.
- **Pieces:** `public/push-sw.js` (push + click handlers, pulled into the generated service worker by `workbox.importScripts` in `vite.config.ts`); `src/lib/push.ts` (subscribe/unsubscribe, saves to `push_subscriptions`); `NotificationsCard` in Settings; `api/send-reminders.ts` (service role, so it bypasses RLS).
- **Sending:** the route finds unsent, undone `reminder_events` with `fire_at <= now`, claims them by setting `sent_at` first (so overlapping runs never double-send, and a failed send is not retried), resolves recipients (owner if private, else all group members), and builds each message in the recipient's own timezone (`api/_lib/pushPayload.ts`). Subscriptions answering 404/410 are deleted.
- **Env vars:** `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (see `.env.example`). The scheduler is `supabase/migrations/0004_push_cron.sql`.
- Best-effort delivery (iOS can delay minutes; Focus modes can silence). Optional email fallback for critical items later.

## Timezone

Both users share one timezone. Store `fire_at` as UTC and a single group timezone for display and "time of day" offsets, so DST changes do not break reminders.

## Out of scope (PWA limits)

Home-screen widgets, reliable badge counts, background sync. Not building a calendar; the focus is the "needs attention" view.

## Open decisions

- Final model provider (Gemini vs Groq vs AI Gateway); verify current free limits at build time.
- Email fallback for critical reminders (later).
