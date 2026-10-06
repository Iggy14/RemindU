# RemindU

An AI life-admin PWA for two people (plus a shared space). Describe a responsibility in plain language — "car insurance renews every 14 March, remind me a month before" — and RemindU turns it into a structured rule, works out the dates, and sends push notifications when they're due.

**Principle:** the AI extracts intent; code does the date maths. The AI never calculates dates.

## Features

- **AI chat** — create or edit reminders by talking; the app asks follow-up questions when details are missing and shows a confirm card before saving.
- **Deterministic rule engine** — one-off deadlines/expiries, recurring (every N days/weeks/months/years, month-end safe), and "N days after last done".
- **Private and shared reminders** — private to you, or shared with everyone in your group.
- **Push notifications** — Web Push (VAPID) on Android Chrome and iOS 16.4+ (installed to Home Screen).
- **Groups** — create a space, share an invite code, join, or leave.
- **Auth** — email + password via Supabase, including password reset.
- **Installable PWA** — mobile-first, safe-area aware, works standalone.

## Tech stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Auth, Postgres, RLS, `pg_cron`) · Vercel (static hosting + `/api` functions) · Vercel AI SDK with Google Gemini · `web-push` · `date-fns` · `zod` · Vitest · oxlint

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project
- A free [Gemini API key](https://aistudio.google.com)
- VAPID keys: `npx web-push generate-vapid-keys`

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | browser | Supabase project URL and public anon key (never the service role key) |
| `GEMINI_API_KEY` | server | Powers `/api/ai/chat` |
| `AI_MODEL` | server, optional | Override the default Gemini model (`src/ai/server/model.ts`) |
| `VITE_VAPID_PUBLIC_KEY` | browser | Web Push public key |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | server | Web Push private key and a `mailto:` contact |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Used by `/api/send-reminders` (bypasses RLS) |
| `CRON_SECRET` | server | Shared secret `pg_cron` sends as a Bearer token |

Server-only variables have no `VITE_` prefix so they never reach the browser. In production, set them in Vercel's environment settings.

### Database

Run the migrations in `supabase/migrations/` **in order** in the Supabase SQL Editor:

1. `0001_profiles_and_groups.sql`
2. `0002_responsibilities.sql`
3. `0003_next_due.sql`
4. `0004_push_cron.sql` (schedules `/api/send-reminders` every ~10 minutes; set your production URL first)

In Supabase → Authentication → URL Configuration, add every origin that runs the app to **Redirect URLs** (needed for password reset).

### Run

```bash
npm run dev
```

`/api/**` is served by the dev server using the same handler files Vercel deploys (`scripts/vite-api-plugin.ts`), so no separate backend process is needed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (app + `/api`) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run unit tests with Vitest |

## Project structure

```
api/                 Vercel serverless functions (ai/chat, send-reminders)
src/
  ai/                Zod schema, intent routing, draft/edit logic
  components/        UI (shadcn/ui in components/ui)
  hooks/             Data and chat hooks
  lib/               Supabase client, auth, groups, router, push
  pages/             Todo, Chat, Reminders, Settings tabs
  ruleEngine/        Pure, unit-tested date logic
supabase/migrations/ SQL migrations (run by hand)
docs/                ARCHITECTURE.md, TODO.md
```

## Deployment

Deploy to Vercel. `vercel.json` rewrites every non-`/api` path to `index.html` so deep links survive a refresh. Because Vercel Hobby cron runs only once a day, reminders are triggered by Supabase `pg_cron` calling `/api/send-reminders`.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design, data model, patterns and extension points
- [`docs/TODO.md`](docs/TODO.md) — roadmap and deferred work
