-- DropIndex
DROP INDEX "PlatformListing_platform_externalId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeEventCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformListing_platform_externalId_key" ON "PlatformListing"("platform", "externalId");

