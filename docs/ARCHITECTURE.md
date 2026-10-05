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
Phone PWA ──► /api/ai/parse ──► LLM (JSON rule) ──► validate (zod)
    │                                   │ missing fields? -> follow-up question
    ▼                                   ▼
 confirm card ──► Supabase (responsibility + offsets) ──► ruleEngine computes due dates
                                                            │
pg_cron (10 min) ──► /api/send-reminders ──► find due reminders ──► Web Push to all relevant members
```

## Modules

- `src/ruleEngine/` – pure functions: `computeNextDue(rule, now)`, `expandOffsets(due, offsets)`, handles month-end, leap years, "N days after previous", recurrence. No I/O, fully unit-tested.
- `src/ai/schema.ts` – zod schema for what the AI may emit (title, category, scope, anchor date, recurrence, offsets, missing[]).
- `api/ai/parse.ts` – NL -> draft rule, or a follow-up question when required fields are null.
- `api/ai/edit.ts` – NL edit -> `{targetId, patch}`; app applies it and recomputes dates.
- `api/ai/chat.ts` – plain streaming chat for the AI chat tab.
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

## Security

- **RLS on every table.** A private responsibility is readable only by its owner; shared ones by group members. Never rely on UI hiding.
- AI/API keys and the VAPID private key live only in Vercel/Supabase env vars, never in the client.
- `/api/send-reminders` requires a secret header; AI routes require a valid Supabase session and per-user rate limiting.
- AI output is untrusted: always zod-validated and shown on a confirm card before saving.

## Notifications

- Everyone in the group is notified for their own private reminders **and** all shared reminders, regardless of which space they are viewing.
- Permission is requested from a button tap (required on iOS). Subscription stored per device.
- Best-effort delivery (iOS can delay minutes; Focus modes can silence). Optional email fallback for critical items later.

## Timezone

Both users share one timezone. Store `fire_at` as UTC and a single group timezone for display and "time of day" offsets, so DST changes do not break reminders.

## Out of scope (PWA limits)

Home-screen widgets, reliable badge counts, background sync. Not building a calendar; the focus is the "needs attention" view.

## Open decisions

- Final model provider (Gemini vs Groq vs AI Gateway); verify current free limits at build time.
- Email fallback for critical reminders (later).
