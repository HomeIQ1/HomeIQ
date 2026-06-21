# HomeIQ AI

**Type an address, get a complete CMA in seconds.** HomeIQ is an AI-assisted
workspace for independent residential real-estate agents. Enter a property
address and it generates a Comparative Market Analysis (estimated value range,
comparable sales, price-per-sqft) plus client-ready listing copy — then saves
each analysis to the agent's account.

This repository is a working MVP: real authentication, a Postgres-backed
database with per-account isolation, create/delete transactions through the UI,
and product analytics.

- **Live demo:** `https://YOUR-DEPLOYMENT.vercel.app` _(replace after deploying)_
- **Stack:** Next.js (App Router) · TypeScript · Supabase (Postgres + Auth) ·
  PostHog · deployed on Vercel

---

## Table of contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Run it locally](#run-it-locally)
5. [Environment variables](#environment-variables)
6. [Database setup (Supabase)](#database-setup-supabase)
7. [Analytics setup (PostHog)](#analytics-setup-posthog)
8. [Deploying to Vercel](#deploying-to-vercel)
9. [Two run modes explained](#two-run-modes-explained)
10. [Project structure](#project-structure)

---

## What it does

- **Sign up / sign in / sign out** with email + password.
- **Generate a CMA** from any address. The value range and comps are computed
  locally so the app works with **no external API key**; if an Anthropic key is
  provided, the market commentary and listing copy are written by an LLM.
- **Save & revisit** analyses. Each CMA belongs to the signed-in agent and
  persists across sessions.
- **Delete** a saved CMA. Both create and delete round-trip to the database and
  update the UI immediately.
- **Per-account isolation**: enforced in the database with Row Level Security,
  not just in client code.
- **Analytics**: a custom `cma_generated` event (plus `user_signed_up`) is sent
  to PostHog.

---

## Architecture

```
Browser (React / Next.js client components)
        |  fetch()
        v
Next.js Route Handlers  -->  lib/data.ts  -->  Supabase (Postgres + Auth)
  /api/auth/*                (dispatch)          - cmas table
  /api/cmas, /api/cmas/[id]                      - Row Level Security
        |
        +-->  lib/cma.ts  (deterministic CMA generator - no API key needed)

PostHog  <-- lib/analytics.tsx  (custom events from the client)
```

---

## Prerequisites

- **Node.js 20 or newer** (developed on Node 22). Check with `node --version`.
- **npm** (ships with Node).
- A **Supabase** account (free tier) — for the live database + auth.
- A **PostHog** account (free cloud tier) — for analytics.

> You can run the app with **zero accounts** in demo mode (see
> [Two run modes](#two-run-modes-explained)). The accounts above are only needed
> for the full live experience.

---

## Run it locally

```bash
# 1. Clone
git clone https://github.com/YOUR-USERNAME/homeiq.git
cd homeiq

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
#    then open .env.local and fill in the values (see below).
#    To try the app immediately WITHOUT any accounts, you can skip this step —
#    it will boot in demo mode.

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000**. Create an account, generate a CMA, and it will
appear in your saved list.

To run a production build locally:

```bash
npm run build
npm run start
```

---

## Environment variables

All variables live in `.env.local` (never committed). See `.env.example` for a
copy-paste template.

| Variable | Required | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | for live mode | Supabase -> Project Settings -> Data API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for live mode | Supabase -> Project Settings -> API Keys -> anon / publishable key |
| `NEXT_PUBLIC_POSTHOG_KEY` | for analytics | PostHog -> Settings -> Project -> Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | for analytics | `https://us.i.posthog.com` (US) or `https://eu.i.posthog.com` (EU) |
| `ANTHROPIC_API_KEY` | optional | [console.anthropic.com](https://console.anthropic.com) — enables LLM-written copy; server-side only |

If the two `SUPABASE` variables are absent, the app automatically runs in demo
mode. If the PostHog key is absent, analytics calls become no-ops. If
`ANTHROPIC_API_KEY` is absent, the CMA prose comes from the built-in
deterministic generator instead of an LLM — every feature still works.

---

## Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the left sidebar open **SQL Editor -> New query**.
3. Paste the entire contents of [`supabase/migration.sql`](./supabase/migration.sql)
   and click **Run**. This creates the `cmas` table and the Row Level Security
   policies that isolate each user's data.
4. Open **Authentication -> Sign In / Providers -> Email** and turn **off**
   "Confirm email" so new accounts can sign in immediately (recommended for this
   MVP; with it on, users must click a link in their inbox first).
5. Copy your **Project URL** and **anon key** from **Project Settings -> Data API
   / API Keys** into `.env.local`.

### The `cmas` table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, auto-generated |
| `user_id` | `uuid` | FK -> `auth.users(id)`, cascade on delete |
| `property_address` | `text` | the address the agent entered |
| `generated_cma` | `text` | JSON: value range, comps, price/sqft |
| `listing_copy` | `text` | generated listing description |
| `created_at` | `timestamptz` | defaults to `now()` |

---

## Analytics setup (PostHog)

1. Create a free account at [posthog.com](https://posthog.com) and a project.
2. Go to **Settings -> Project** and copy the **Project API Key** (starts with
   `phc_`).
3. Put it in `.env.local` as `NEXT_PUBLIC_POSTHOG_KEY`, and set
   `NEXT_PUBLIC_POSTHOG_HOST` to match your region (US or EU).
4. Run the app, sign up, and generate a CMA. Within a minute you'll see
   `user_signed_up` and `cma_generated` under **Activity -> Events** in PostHog.

The custom event is fired in `app/dashboard/DashboardClient.tsx`:

```ts
capture("cma_generated", { address_tag, total_cmas });
```

Note: the raw address is never sent — only a hashed `address_tag`.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. At [vercel.com](https://vercel.com) -> **Add New -> Project**, import the repo.
3. Under **Environment Variables**, add the same four variables from your
   `.env.local`.
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.
5. In Supabase, add your Vercel URL under **Authentication -> URL Configuration
   -> Site URL / Redirect URLs**.

---

## Two run modes explained

The app works whether or not external services are configured:

- **Live mode** (Supabase variables present): real email/password auth via
  Supabase Auth, data stored in Postgres, isolation enforced by Row Level
  Security. This is the intended production configuration.
- **Demo mode** (Supabase variables absent): a self-contained fallback so the
  app runs with zero setup. Auth uses a signed HTTP-only cookie session and
  data is held in server memory. Useful for a quick local look; **not** a
  security model for real data.

The switch is automatic, based on whether the environment variables are set
(see `lib/config.ts`).

---

## Project structure

```
app/
  page.tsx                  Landing page
  login/                    Auth screen (sign in / sign up)
  dashboard/                The agent workspace (generate / list / delete)
  api/
    auth/{signup,signin,signout}/   Auth endpoints
    cmas/                   Create + list CMAs
    cmas/[id]/              Delete a CMA
lib/
  config.ts                 Reads env, decides live vs demo mode
  supabase.ts               Supabase browser/server clients
  data.ts                   Unified data access (dispatches live vs demo)
  demoStore.ts              In-memory fallback for demo mode
  cma.ts                    Deterministic CMA generator (no API key)
  analytics.tsx             PostHog init + safe capture wrapper
supabase/
  migration.sql             Table + Row Level Security — paste into Supabase
middleware.ts               Refreshes Supabase auth session (live mode)
```

---

## License

Built as a pre-seed MVP demonstration for HomeIQ AI.
