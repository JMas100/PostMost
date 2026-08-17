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
| `STORAGE_PROVIDER` | Storage adapter to use (default `r2`) |
| `R2_ACCOUNT_ID` | Cloudflare account ID (used to build the R2 S3 endpoint) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token credentials with object read/write on the bucket |
| `R2_BUCKET` | R2 bucket name that stores listing photos |
| `R2_PUBLIC_BASE_URL` | Public CDN/custom-domain base URL images are served from (e.g. `https://images.postmost.co`) |
| `S3_ENDPOINT` | Optional S3 endpoint override for another S3-compatible host (e.g. MinIO locally); defaults to R2 |
| `NEXT_IMAGE_HOSTS` | Optional extra comma-separated hostnames allowed for `next/image` |
| `BG_REMOVER` | Background-removal adapter: `birefnet` (default) or `photoroom` |
| `FAL_KEY` | fal.ai key used by the BiRefNet adapter |
| `BIREFNET_MODEL` / `BIREFNET_RESOLUTION` | Optional BiRefNet variant and operating resolution |
| `PHOTOROOM_API_KEY` | PhotoRoom key for the premium fallback |

Outside production, a `DATABASE_URL` that is not a `*.neon.tech` host uses Prisma's standard TCP
client instead of the Neon serverless driver, so a local Postgres works without any code change.

## Image storage

Listing photos live in object storage, not in the database. `lib/storage/` mirrors the marketplace
adapter pattern: `lib/storage/types.ts` defines `StorageAdapter`, `lib/storage/adapters/r2.ts`
implements it with the AWS S3 SDK pointed at Cloudflare R2, and `getStorage()` picks the adapter
from `STORAGE_PROVIDER`. Because it speaks the plain S3 API, swapping to AWS S3 or any other
S3-compatible host is a new adapter plus config — no caller changes.

Upload flow (browser never proxies bytes through the serverless function, so the 4.5 MB body limit
doesn't apply):

1. The listing form POSTs file metadata to `/api/upload`, which requires a session (401 otherwise)
   and rejects non-image types or files over 10 MB.
2. The route returns presigned `PUT` URLs plus the public CDN URL for each key
   (`listings/<userId>/<uuid>.<ext>`).
3. The browser PUTs each file directly to R2 and stores the returned `https://` URL on the listing.

AI "Enhance photo" results are uploaded the same way, so enhanced images are hosted URLs too.
Legacy base64 `data:` photos already in the database still render, still validate, and still
cross-post through the extension.

### Required R2 bucket CORS policy

The browser PUTs uploads directly and the extension re-fetches images to attach them to marketplace
forms, so the bucket (and the custom domain in front of it) needs CORS. In the Cloudflare dashboard
under R2 > your bucket > Settings > CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-app-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type", "cache-control"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  },
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

Public reads require either R2 public access or a custom domain bound to the bucket; point
`R2_PUBLIC_BASE_URL` at it.

## Background removal

`lib/ai/background/` is a provider registry in the same shape as storage and marketplaces:
`getBackgroundRemover()` resolves `BG_REMOVER` (default `birefnet`), and
`getConfiguredBackgroundRemover()` falls back to whichever provider actually has credentials so a
missing key degrades instead of throwing. Adapters return raw cut-out bytes; `lib/ai/optimize.ts`
encodes them as a `data:` URL that the listing form uploads to storage, so enhanced photos end up
hosted like any other.

| Adapter | Backend | Notes |
| --- | --- | --- |
| `birefnet` | `fal-ai/birefnet/v2` | MIT-licensed weights, billed per GPU-second — the unlimited-removals default |
| `photoroom` | `sdk.photoroom.com/v1/segment` | Premium fallback for hair, sheer fabric, white-on-white; sandbox keys are watermarked |

To compare providers on your own photos before choosing a production default:

```bash
npx tsx -r dotenv/config scripts/bake-off-bg-removal.ts --input ./samples --out ./bakeoff
```

It writes each provider's cut-outs into `<out>/<provider>/` plus `results.csv` with per-image
latency and output size, and skips providers whose keys are missing.

### Backfilling legacy base64 photos

Optional, never run during a build:

```bash
npx tsx scripts/migrate-photos-to-blob.ts --dry-run
npx tsx scripts/migrate-photos-to-blob.ts --limit 100
```

It uploads every `Photo` row whose `url` starts with `data:` and rewrites the row to the hosted URL.
Re-running only picks up rows that are still base64.

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
- AI listing generation
- Sales analytics and P&L
- Mobile app
