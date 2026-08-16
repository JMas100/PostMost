-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PlatformListing" ADD COLUMN "soldPrice" DOUBLE PRECISION;
ALTER TABLE "PlatformListing" ADD COLUMN "soldFees" DOUBLE PRECISION;
ALTER TABLE "PlatformListing" ADD COLUMN "soldShippingCost" DOUBLE PRECISION;
ALTER TABLE "PlatformListing" ADD COLUMN "profit" DOUBLE PRECISION;
