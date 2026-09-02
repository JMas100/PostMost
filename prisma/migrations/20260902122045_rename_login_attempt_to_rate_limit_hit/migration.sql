-- Rename, not drop+create -- preserves existing rows and their createdAt history instead of
-- silently resetting everyone's rate-limit windows on deploy. Prisma's own diff engine can't
-- infer "this is a rename" from a model-name change alone, so this is hand-written.
ALTER TABLE "LoginAttempt" RENAME TO "RateLimitHit";
ALTER INDEX "LoginAttempt_identifier_createdAt_idx" RENAME TO "RateLimitHit_identifier_createdAt_idx";
ALTER TABLE "RateLimitHit" RENAME CONSTRAINT "LoginAttempt_pkey" TO "RateLimitHit_pkey";
