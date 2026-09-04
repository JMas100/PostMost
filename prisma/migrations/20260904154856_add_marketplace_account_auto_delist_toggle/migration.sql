-- Per-platform auto-delist toggle (Marketplaces v2 design spec). Default true preserves today's
-- always-on behavior for every existing account -- this adds an opt-out, not a behavior change.
ALTER TABLE "MarketplaceAccount" ADD COLUMN "autoDelistEnabled" BOOLEAN NOT NULL DEFAULT true;
