# PostMost

A reseller operating system that lets you create one listing and cross-post it to multiple marketplaces.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (dev)
- NextAuth (credentials)

## Features

- Universal listing form
- Cross-post queue and status tracking
- Marketplace adapter architecture (eBay, Etsy, Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted, Grailed)
- Dashboard with listing stats
- Authentication

## Setup

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `demo@postmost.co` / `demo123`.

## Environment

Copy `.env.example` to `.env` and set at least:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Pooled and direct Postgres connection strings |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth base URL and signing secret |
| `APP_URL` | Absolute base URL used to trigger the job worker (falls back to `NEXTAUTH_URL`) |
| `MASTER_KEY` | 64-char hex for OAuth token encryption; also authorizes `/api/jobs/run` via `x-master-key` |
| `CRON_SECRET` | Secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>` to `/api/jobs/run` |

Outside production, a `DATABASE_URL` that is not a `*.neon.tech` host uses Prisma's standard TCP
client instead of the Neon serverless driver, so a local Postgres works without any code change.

## Cross-post job worker

Cross-posting is queued, never executed inside the request. `crossPost()` writes `CrossPostJob`
rows and fires a non-blocking POST to `/api/jobs/run`; the durable backstop is the Vercel cron in
`vercel.json`, which drains the queue every minute.

- Jobs are claimed atomically (`PENDING` -> `RUNNING` with `lockedAt`), so the cron and the inline
  trigger can safely overlap.
- Each `adapter.post` call is bounded by a 60s timeout.
- Failures retry with exponential backoff (1m, 5m, 15m) until `maxAttempts` (default 3), then the
  job and its `PlatformListing` are marked `FAILED`.
- A `RUNNING` job whose `lockedAt` is older than 5 minutes is reclaimed as `PENDING`.

Run the worker manually:

```bash
curl -X POST http://localhost:3000/api/jobs/run -H "x-master-key: $MASTER_KEY"
```

Note: Vercel Hobby plans only run crons once per day; `* * * * *` requires a Pro plan. On Hobby the
cron still guarantees eventual processing, just with up to a day of delay, so keep the inline
trigger enabled (or call the endpoint from an external scheduler).

## Marketplace integrations

- **API-enabled**: eBay, Etsy (scaffolded, needs OAuth credentials)
- **Automation-ready**: Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted, Grailed (Playwright stubs)

## Roadmap

- Real OAuth flows for eBay/Etsy
- Playwright worker service for automation platforms
- Image upload and background removal
- AI listing generation
- Sales analytics and P&L
- Mobile app
