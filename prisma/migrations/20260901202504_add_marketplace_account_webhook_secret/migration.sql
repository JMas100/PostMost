-- AlterTable: add as nullable first, backfill a random per-row secret for existing accounts,
-- then enforce NOT NULL. md5() is a built-in Postgres function (no pgcrypto extension needed);
-- combining it with each row's own id, clock_timestamp(), and random() gives every existing row
-- an unpredictable, distinct value -- this is a one-time bootstrap for rows that predate this
-- column, not the ongoing generation mechanism (new rows get a real crypto.randomBytes-based
-- secret from application code; see lib/actions/accounts.ts).
ALTER TABLE "MarketplaceAccount" ADD COLUMN     "webhookSecret" TEXT;

UPDATE "MarketplaceAccount"
SET "webhookSecret" = md5(id || clock_timestamp()::text || random()::text)
WHERE "webhookSecret" IS NULL;

ALTER TABLE "MarketplaceAccount" ALTER COLUMN "webhookSecret" SET NOT NULL;
