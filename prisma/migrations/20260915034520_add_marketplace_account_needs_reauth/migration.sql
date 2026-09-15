-- Surfaces a real login-rejection failure on the account itself (Marketplaces page), not just
-- in a notification -- set on a terminal signed-out-shaped job failure, cleared on reconnect or
-- the next real success.
ALTER TABLE "MarketplaceAccount" ADD COLUMN "needsReauth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketplaceAccount" ADD COLUMN "needsReauthReason" TEXT;
