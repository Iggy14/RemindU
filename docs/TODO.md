# RemindU – TODO

See `ARCHITECTURE.md` for the design.

## 0. Setup
- [ ] Create Supabase project, Vercel project, GitHub repo
- [ ] Get AI key (Gemini or Groq) and generate VAPID keys
- [ ] Decide env var layout (`.env.local`, Vercel env)

## 1. App shell
- [x] Scaffold Vite + React + TypeScript (+ Tailwind v4, shadcn/ui)
- [x] PWA manifest + service worker (`vite-plugin-pwa`)
- [ ] PNG icons for the manifest: only `public/favicon.svg` exists, and iOS Home Screen needs `apple-touch-icon` (180px) plus 192/512 PNGs. Generate them from the SVG, add to `public/`, then list them in `manifest.icons` in `vite.config.ts` and add `<link rel="apple-touch-icon">` to `index.html`
- [x] Bottom tab bar: To-do, AI chat, All Reminders, Settings (tabs are plain state in `src/App.tsx`, no router yet; add one if deep links are needed)
- [x] Mobile-first layout (safe areas, standalone mode)
- [ ] Deploy to Vercel; install to iPhone and Android Home Screen to confirm

## 2. Auth, groups, data
- [ ] Supabase Auth (sign up / log in)
- [ ] Schema + migrations: profiles, groups, group_members, responsibilities, reminder_offsets, reminder_events, push_subscriptions
- [ ] RLS policies (private vs shared) + tests proving user B cannot read user A's private items
- [ ] Create group, invite link/code, join flow
- [ ] Settings: own account, partner, Shared

## 3. Rule engine (no AI yet)
- [ ] `ruleEngine` module: one-off, recurring (monthly/yearly), expiry, "N days after previous"
- [ ] Offsets expansion (30d / 7d / 1d before)
- [ ] Unit tests: month-end, leap year, DST, overdue
- [ ] Materialise `reminder_events` on create/edit

## 4. Reminders UI (manual)
- [ ] All Reminders list with Personal / Partner / Shared switcher
- [ ] Manual add / edit / delete
- [ ] To-do home: greeting + "needs attention" list (due soon / overdue)
- [ ] Mark done / snooze

## 5. AI
- [ ] zod schema for AI output
- [ ] `/api/ai/parse`: NL -> draft rule, follow-up questions only for missing fields
- [ ] Confirm card before saving
- [ ] `/api/ai/edit`: natural-language edits ("visa expires Jan 20 instead")
- [ ] `/api/ai/chat`: streaming chat tab
- [ ] Auth + rate limiting on AI routes
- [ ] Keep model provider swappable in one file

## 6. Notifications
- [ ] Service worker push handler + notificationclick
- [ ] Enable-notifications button (user gesture), save subscription
- [ ] `/api/send-reminders` (secret-protected), fan-out to all group members
- [ ] Supabase `pg_cron` every ~10 min calling the route
- [ ] Test on real iPhone (Home Screen install) and Android, app closed
- [ ] Configurable reminder timing in Settings
- [ ] (Later) email fallback for critical reminders

## 7. Polish
- [ ] Empty states, loading, error handling
- [ ] Subscription/expiry category views
- [ ] Dark mode
- [ ] README with setup steps
