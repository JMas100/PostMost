-- Per-platform field corrections (size/category/condition/brand) applied on a failed
-- cross-post's inline retry, without touching the base listing or any other platform.
ALTER TABLE "PlatformListing" ADD COLUMN "fieldOverrides" TEXT;
