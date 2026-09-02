# Browser worker

Runs real Playwright automation (Poshmark, Mercari, Depop, Facebook, Craigslist, OfferUp,
Vinted, Grailed) for the main app, on a persistent host instead of inside a Vercel serverless
function. See the main [README.md](../README.md) and `lib/marketplaces/automation/create-adapter.ts`
for why: `@sparticuz/chromium` in a Vercel function was fragile at scale (cold starts, per-function
memory/size limits, a real production incident from launching more than one browser in a single
invocation). This service exists to get Chromium out of Vercel entirely.

## How it fits together

- This directory imports `lib/marketplaces/automation/`, `lib/marketplaces/adapters/`, and
  `lib/storage/` **directly from the main app's source** — not a copy. Those files have zero
  Prisma/Next.js dependencies (confirmed before this was built), so they run unmodified here.
- `src/server.ts` exposes one endpoint, `POST /execute`, that mirrors the `MarketplaceAdapter`
  interface (`lib/marketplaces/types.ts`) — `{ platform, action, ...args }` in, that method's
  normal return value out. Authenticated via `Authorization: Bearer <BROWSER_WORKER_SECRET>`.
- On the main app side, `createManualAdapter` (`lib/marketplaces/automation/create-adapter.ts`)
  forwards every manual-adapter call here over HTTP when `BROWSER_WORKER_URL` is set (production).
  Unset (local dev, the default), it runs today's in-process automation instead — **no worker
  required for local dev.**
- Deliberately no fallback to in-process automation if this service is unreachable — see the
  comment on `callBrowserWorker` in `create-adapter.ts`. A failure here becomes a normal job
  failure and gets retried by the existing `CrossPostJob` backoff, not a silent reintroduction of
  the Vercel-Chromium fragility this exists to remove.

## Local development

No Docker needed for iterating on this:

```bash
cd worker
npm install
BROWSER_WORKER_SECRET=some-local-secret npm run dev
```

Then, in the main app's `.env`, temporarily set `BROWSER_WORKER_URL=http://localhost:4000` and
the matching `BROWSER_WORKER_SECRET` to route manual-adapter calls through it instead of running
in-process — useful for testing this service itself, not needed for everyday main-app dev.

## Docker build — build context must be the repo root

```bash
# From the repo root, NOT from inside worker/:
docker build -f worker/Dockerfile -t postmost-worker .
docker run -p 4000:4000 -e BROWSER_WORKER_SECRET=... postmost-worker
```

The Dockerfile needs `lib/marketplaces` and `lib/storage` from outside `worker/`, so the build
context has to be the directory that contains both — the repo root. If you configure this in a
platform's dashboard (Railway, etc.), make sure it builds with **root directory unset/`.`** and
**Dockerfile path `worker/Dockerfile`** — restricting the build's root directory to `worker/`
will break the build, since it won't be able to see `lib/` at all.

Two tsconfigs exist on purpose: `tsconfig.json` (local dev) and `tsconfig.docker.json` (used only
inside the image, copied in as `tsconfig.json`). Node's module resolution only walks *up* from an
importing file looking for `node_modules`, and `lib/marketplaces` needs to end up as a real
descendant of wherever `node_modules` lives for `import("playwright-core")` inside
`playwright-runner.ts` to resolve — a sibling-directory copy (matching the real repo's `worker/`-
next-to-`lib/` layout) breaks that in Docker even though the `@/` alias itself still resolves
fine. See the comment at the top of `tsconfig.docker.json` for the full explanation.

## Deploying (Railway)

1. Create a new Railway service from this repo.
2. Set **Dockerfile Path** to `worker/Dockerfile`, and leave the build **Root Directory** unset
   (must build from the repo root — see above).
3. Environment variables:
   - `BROWSER_WORKER_SECRET` — generate a random secret (`openssl rand -hex 32`); this is
     **separate** from `MASTER_KEY` (which only ever encrypts stored marketplace passwords) —
     never reuse an encryption key as a transport secret.
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
     `R2_PUBLIC_BASE_URL` — same values as the main app, for uploading failure screenshots.
4. On the main app (Vercel), set `BROWSER_WORKER_URL` to the deployed Railway service's URL and
   `BROWSER_WORKER_SECRET` to the same value as step 3.
5. Verify: `curl https://<railway-url>/health` should return `{"ok":true}`.

No `--shm-size` configuration needed on the host — `playwright-runner.ts`'s launch args already
include `--disable-dev-shm-usage` (Chromium reliably exhausts Docker's default 64MB `/dev/shm`
otherwise, which manifests as a hang, not a clean error).
