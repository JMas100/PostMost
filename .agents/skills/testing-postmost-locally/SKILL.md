---
name: testing-postmost-locally
description: How to run and end-to-end test PostMost (Next.js + Prisma + Neon) locally, including the local-Postgres workaround, seeded demo login, how to exercise the cross-post job queue / worker endpoint, and how to test photo uploads against a local S3-compatible (MinIO) storage endpoint.
---

# Testing PostMost locally

## Database
- Local Postgres may be installed but stopped: `sudo pg_ctlcluster 14 main start`. DB `postmost`, user/pass `postgres`/`postgres`.
- If Postgres is not installed at all (no `pg_ctlcluster`, no `/etc/postgresql`), Docker is available — `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postmost -p 5432:5432 postgres:14` works, and psql is then reachable via `docker exec pg psql -U postgres -d postmost -c "..."`.
- `prisma/seed.js` does NOT load dotenv itself, so `npm run seed` can fail with "Environment variable not found: DATABASE_URL". Run `node -r dotenv/config prisma/seed.js` instead. Same for scripts: `npx tsx -r dotenv/config scripts/<script>.ts`.
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

## Photo uploads / object storage (R2 or any S3-compatible host)
- Listing photos are uploaded from the browser via presigned PUT URLs: `components/listing-form.tsx` → `lib/upload-client.ts` → `POST /api/upload` → `lib/storage/adapters/r2.ts` (AWS S3 SDK). `POST /api/upload` returns 401 without a session, and 503 unless storage is configured: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` **and** either `R2_ACCOUNT_ID` or `S3_ENDPOINT` (`isStorageConfigured()` in `lib/storage/index.ts`).
- No real Cloudflare R2 credentials exist in dev. Use MinIO as a stand-in — **no code patch needed**, `S3_ENDPOINT` overrides the endpoint and turns on `forcePathStyle`:
  ```
  docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"
  docker exec minio mc alias set local http://127.0.0.1:9000 minioadmin minioadmin
  docker exec minio mc mb local/postmost-photos
  docker exec minio mc anonymous set download local/postmost-photos   # so <img> can read the objects
  ```
  Then in `.env` (restart `npm run dev` after editing):
  ```
  STORAGE_PROVIDER="r2"
  S3_ENDPOINT="http://localhost:9000"
  R2_ACCESS_KEY_ID="minioadmin"
  R2_SECRET_ACCESS_KEY="minioadmin"
  R2_BUCKET="postmost-photos"
  R2_PUBLIC_BASE_URL="http://localhost:9000/postmost-photos"
  ```
  To exercise the 503 path first, leave these unset, hit the file input, and expect the toast "Image storage is not configured".
- Caveat: MinIO serves plain HTTP, so stored URLs are `http://localhost:9000/...` rather than `https://`. That is a harness artifact — the scheme comes verbatim from `R2_PUBLIC_BASE_URL`. Photo rendering uses plain `<img>` everywhere, so `next.config.mjs` `images.remotePatterns` (https-only) does not block local testing. Real-R2-specific signing/https behaviour still cannot be proven locally.
- Verify bytes actually landed with `docker exec minio mc ls --recursive local/postmost-photos` (compare object size to the source file), and that DB rows are hosted URLs: `select url from "Photo" order by "createdAt" desc limit 5;` — must NOT start with `data:`.
- For API-only cases the UI cannot produce (malformed JSON body → 400, >20 files → 400), get a real session in the shell instead of scraping browser cookies:
  ```
  CSRF=$(curl -s -c c.txt localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
  curl -s -b c.txt -c c.txt -X POST localhost:3000/api/auth/callback/credentials \
    -d "csrfToken=$CSRF&email=demo@postmost.co&password=demo123&json=true"
  curl -s -b c.txt localhost:3000/api/auth/session   # confirms the session
  ```
- Backfill script: `npx tsx -r dotenv/config scripts/migrate-photos-to-blob.ts [--dry-run] [--limit N]`. It only touches rows whose url starts with `data:`, so re-running should report `Found 0 base64 photo(s)` (idempotency check). Seed a legacy row first by inserting a small `data:image/png;base64,...` Photo via psql.
- Saving a draft deletes and recreates its `Photo` rows (ids change) while preserving the url values — do not assert on photo ids across an edit.
- AI "Enhance photo" needs `FAL_KEY` (BiRefNet, the default) or `PHOTOROOM_API_KEY` with `BG_REMOVER=photoroom`; other AI buttons need `OPENAI_API_KEY`. Without them that path cannot be exercised — mark it untested rather than faking it.

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
- None for local testing (MASTER_KEY/CRON_SECRET/NEXTAUTH_SECRET can be any local values; storage can point at a local MinIO via `S3_ENDPOINT`). Real marketplace testing would need `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_RU_NAME`, `EBAY_CATEGORY_ID` (and Etsy equivalents). Testing against real Cloudflare R2 would need `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`. AI photo enhancement needs `FAL_KEY` (or `PHOTOROOM_API_KEY`) / `OPENAI_API_KEY`.
