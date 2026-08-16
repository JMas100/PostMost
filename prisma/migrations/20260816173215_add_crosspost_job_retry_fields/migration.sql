-- AlterTable
ALTER TABLE "CrossPostJob" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "CrossPostJob_status_nextRunAt_idx" ON "CrossPostJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "CrossPostJob_listingId_idx" ON "CrossPostJob"("listingId");

-- CreateIndex
CREATE INDEX "CrossPostJob_userId_idx" ON "CrossPostJob"("userId");
