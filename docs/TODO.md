# RemindU – TODO

See `ARCHITECTURE.md` for the design.

## 0. Setup
- [ ] Create Supabase project (done by user on a second Supabase account), Vercel project, GitHub repo
- [ ] Get AI key (Gemini or Groq) and generate VAPID keys
- [x] Env var layout: `.env.example` -> `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Server-only secrets (service role, VAPID private, AI key) go in Vercel env only

## 1. App shell
- [x] Scaffold Vite + React + TypeScript (+ Tailwind v4, shadcn/ui)
- [x] PWA manifest + service worker (`vite-plugin-pwa`)
- [ ] PNG icons for the manifest: only `public/favicon.svg` exists, and iOS Home Screen needs `apple-touch-icon` (180px) plus 192/512 PNGs. Generate them from the SVG, add to `public/`, then list them in `manifest.icons` in `vite.config.ts` and add `<link rel="apple-touch-icon">` to `index.html`
- [x] Bottom tab bar: To-do, AI chat, All Reminders, Settings (tabs are plain state in `src/App.tsx`, no router yet; add one if deep links are needed)
- [x] Mobile-first layout (safe areas, standalone mode)
- [ ] Deploy to Vercel; install to iPhone and Android Home Screen to confirm

## 2. Auth, groups, data
- [x] Supabase Auth, email + password (`AuthProvider`, `AuthScreen`). Untested against a real project: needs `.env.local` filled in and migration 0001 run
- [ ] Schema + migrations: profiles, groups, group_members are in `supabase/migrations/0001_profiles_and_groups.sql` (run; sign-up and login confirmed working). `0002_responsibilities.sql` (run, no errors) and `0003_next_due.sql` (adds `next_due`; written, not yet run). RLS for 0002 is not yet proven with two users
- [ ] RLS for responsibilities (private vs shared) + tests proving user B cannot read user A's private items. Groups/profiles RLS is written but unverified: after running 0001, sign up two users and confirm a non-member sees no group rows and `join_group` with a bad code fails. Automate once there are two test accounts (e.g. a script using `@supabase/supabase-js` with two signed-in clients)
- [x] Create group, invite code, join flow (`GroupSetup`, `create_group`/`join_group` RPCs). No member cap in the schema. Invite codes are 8 chars from a 32-char alphabet; no rate limit on `join_group` yet, add one before public launch
- [ ] Settings: own account + group/members/invite code are shown; still missing: edit display name, change timezone (it is auto-set from the browser on first load by `ensureTimezone`), leave group

## 3. Rule engine (no AI yet)
- [x] `ruleEngine` module: one-off, recurring (monthly/yearly), expiry, "N days after previous"
- [x] Offsets expansion (30d / 7d / 1d before)
- [x] Unit tests: month-end, leap year, DST, overdue (`npm test`)
- [ ] Materialise `reminder_events` on create/edit: the pure part is done (`planReminders` in `src/ruleEngine/index.ts` returns due date + fire times). Still needed once Supabase exists (§2): on create/edit, delete unsent events for the responsibility and insert `plan.fires`; after the user marks one done, recompute (`after_previous`: set `previous` to the done date). Recurring rules should also be re-planned when their due date passes (scheduler or mark-done)

## 4. Reminders UI (manual)
- [x] All Reminders list with Personal / Shared switcher. No "Partner" tab on purpose: private items are owner-only under RLS, so a partner's private items can never be shown
- [x] Manual add / edit / delete (`ResponsibilityForm`, `src/lib/responsibilities.ts`). Reminder times are fixed at 09:00 in the form; a time picker is not built
- [x] To-do home: greeting + "needs attention" list (due within 7 days or overdue)
- [x] Mark done (`advanceAfterDone` decides the next due date)
- [ ] Snooze: skipped. Needs a design decision first: snooze should probably push the *reminder* (not the due date) by N days. Likely steps: add `snoozed_until date` to `responsibilities` in a new migration, hide snoozed items from the To-do list until then, and have the scheduler skip them; add a Snooze button in `src/components/ResponsibilityRow.tsx`
- [ ] Not yet verified in a browser against the real project: run migration 0003, then add one item of each rule type, mark each done, edit, delete, and check `reminder_events` rows in the Supabase table editor
- [ ] `reminder_events` are written from the client (`syncSchedule` in `src/lib/responsibilities.ts`), delete-then-insert, not atomic, and computed in the editing user's timezone. Fine for two people; if it ever misbehaves, move it into a Postgres function or an `/api` route

## 5. AI
- [x] zod schema for AI output (`src/ai/schema.ts`)
- [x] Parsing new reminders from text with follow-up questions only for missing fields (verified working with Gemini by the user; now served by `/api/ai/chat`)
- [x] Confirm card before saving (`DraftCard`; no edit-in-place yet: users edit afterwards from Reminders. Could add an "Edit" button that opens `ResponsibilityForm` prefilled with the draft)
- [x] Natural-language edits ("visa expires Jan 20 instead"): handled by `/api/ai/chat` with `intent: edit` (`src/ai/applyEdit.ts`), shown as a before/after card
- [x] Chat: one endpoint `/api/ai/chat` decides add / edit / ask per message (single model call). "Ask" is read-only and answers only from the reminder list the server fetches with the caller's token. Conversation now survives tab switches (`ChatProvider`). Not streaming (replies are short); add streaming only if latency feels bad
- [ ] AI chat not yet verified with real Gemini for edit/ask. Try: "change Netflix to the 10th", "make rent shared", "what is due this month?", "which bills do I have?". Weak spots to watch: the model picking the wrong `targetNumber`, and `ask` answers about "this month" (it must use the day counts in the list, not do date maths)
- [ ] Delete by chat ("delete my gym reminder") is intentionally not supported; add `intent: delete` with a confirm card if wanted
- [x] Auth + rate limiting on AI routes (`api/_lib/auth.ts`, `api/_lib/rateLimit.ts`). The limiter is in-memory per serverless instance (20 req/min/user), so it is a guard against runaway clients, not a hard quota. For a real daily cap, count requests in a Supabase table keyed by user and day, checked in the route
- [x] Keep model provider swappable in one file (`src/ai/server/model.ts`)

## 6. Notifications
- [x] Service worker push handler + notificationclick (`public/push-sw.js`)
- [x] Enable-notifications button (`NotificationsCard` in Settings), saves subscription
- [x] `/api/send-reminders` (secret-protected), fan-out to owner or all group members
- [ ] Not run end to end yet. Steps: `npx web-push generate-vapid-keys`; put `VITE_VAPID_PUBLIC_KEY` in `.env.local` and all vars from `.env.example` in Vercel (`SUPABASE_SERVICE_ROLE_KEY` from Supabase -> Project Settings -> API; invent `CRON_SECRET`); deploy; tap "Turn on notifications" in Settings; create a reminder whose fire time is already past; `curl -X POST https://<app>/api/send-reminders -H "Authorization: Bearer $CRON_SECRET"` and confirm the push arrives
- [ ] Run `supabase/migrations/0004_push_cron.sql` in the SQL Editor after deploying, replacing the two placeholders (URL and `CRON_SECRET`) in the pasted copy only, never in the committed file
- [ ] Test on real iPhone (Home Screen install, iOS 16.4+) and Android with the app closed
- [ ] Notifications are only on/off per device; no quiet hours. Configurable reminder timing (offsets, time of day) is still not built (the form fixes 09:00)
- [ ] A claimed event is never retried: if every push for it fails (e.g. push service outage) the reminder is lost. If that matters, clear `sent_at` on events where zero pushes succeeded in `api/send-reminders.ts`
- [ ] Tapping a notification opens `/` only; no deep link to the reminder (the app has no router)
- [ ] (Later) email fallback for critical reminders

## 7. Polish
- [ ] Empty states, loading, error handling
- [ ] Subscription/expiry category views
- [ ] Dark mode
- [ ] README with setup steps
