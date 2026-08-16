---
name: testing-postmost-locally
description: How to run and end-to-end test PostMost (Next.js + Prisma + Neon) locally, including the local-Postgres workaround, seeded demo login, and how to exercise the cross-post job queue / worker endpoint.
---

# Testing PostMost locally

## Database
- Local Postgres may be installed but stopped: `sudo pg_ctlcluster 14 main start`. DB `postmost`, user/pass `postgres`/`postgres`.
- `.env` needs `DATABASE_URL`/`DIRECT_URL` = `postgresql://postgres:postgres@localhost:5432/postmost`, `NEXTAUTH_URL`/`APP_URL` = `http://localhost:3000`, plus `NEXTAUTH_SECRET`, `MASTER_KEY`, `CRON_SECRET`.
- **`lib/prisma.ts` uses the Neon serverless adapter (`@prisma/adapter-neon`), which cannot talk to a local Postgres** — every DB query 500s locally. Workaround (temporary, do NOT commit unless the team decides to ship a dev fallback): add an env-gated branch, e.g.

  ```ts
  export const prisma = globalForPrisma.prisma ??
    (process.env.LOCAL_PG === "1"
      ? new PrismaClient()
      : new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString })) }));
  ```
  then set `LOCAL_PG=1` in `.env`. Revert both before finishing (`git status` must be clean).
- `npx prisma migrate deploy && npm run seed`, then `npm run dev`. Login: `demo@postmost.co` / `demo123` at `/login`.

## Creating test data through the UI
- `/listings/new`: paste a photo URL (e.g. `https://placehold.co/600x600.png`) and click **Add photo URL** (at least one photo is required), fill Title (≥3 chars), Description (≥10 chars), Price, then **Create listing** → redirects to `/listings/<id>`.
- Listing detail page has: **Cross-post** card (marketplace tiles + "Publish to selected"), **Platform status** badges, and **Recent activity** (job status badges + error text). These are the surfaces to assert cross-post/job behaviour on.

## Cross-post job queue / worker
- `crossPost()` only enqueues `CrossPostJob` rows and fires a non-blocking `POST ${APP_URL}/api/jobs/run` with the `x-master-key` header, so jobs are usually drained within a second or two locally. To observe the PENDING state you must snapshot the DB immediately after the toast, or drop `APP_URL`/`MASTER_KEY` to disable the auto-trigger.
- Worker endpoint: `POST /api/jobs/run` with `x-master-key: $MASTER_KEY` (optional JSON body `{"listingId": "..."}`) or `GET /api/jobs/run` with `Authorization: Bearer $CRON_SECRET` (`?listingId=`). Returns `{processed, succeeded, failed, retried, reclaimed}`.
- Adapter behaviour useful for tests (no real marketplace credentials exist in dev):
  - **Deterministic failure**: `craigslist` always returns `success:false`; any automation platform without a stored password returns "No password stored for X." — good for retry/backoff/FAILED paths.
  - **No adapter succeeds locally** (eBay/Etsy need OAuth tokens, automation adapters need Playwright + real sites). To test the success path, temporarily stub one adapter's `post()` to return `{success:true, externalId, externalUrl}`; adding a `await new Promise(r => setTimeout(r, 6000))` delay also opens a window for concurrency/race tests. Revert the stub afterwards and disclose it in the report.
- Time-dependent behaviour (retry backoff 1m/5m/15m, 5-minute stuck-lock reclaim) is best simulated with SQL instead of waiting:
  `update "CrossPostJob" set "nextRunAt"=now() where ...` and `update "CrossPostJob" set status='RUNNING', "lockedAt"=now() - interval '10 minutes' where ...`.
  Always include the negative control (run the worker *before* `nextRunAt`, or with a fresh `lockedAt`) — otherwise the test would look identical if gating were broken.
- Concurrency: reset a job to PENDING with a slow (stubbed) adapter and fire two `curl` runs with `& ... & wait`; exactly one should report `processed:1` and the DB should show `attempts=1`.

## Devin Secrets Needed
- None for local testing (MASTER_KEY/CRON_SECRET/NEXTAUTH_SECRET can be any local values). Real marketplace testing would need `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_RU_NAME`, `EBAY_CATEGORY_ID` (and Etsy equivalents).
