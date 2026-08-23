-- CreateIndex
CREATE INDEX "Listing_userId_isDraft_idx" ON "Listing"("userId", "isDraft");

-- CreateIndex
CREATE INDEX "PlatformListing_platform_externalId_idx" ON "PlatformListing"("platform", "externalId");

-- CreateIndex
CREATE INDEX "PlatformListing_status_idx" ON "PlatformListing"("status");
