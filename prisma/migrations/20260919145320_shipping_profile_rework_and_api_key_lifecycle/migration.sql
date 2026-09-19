/*
  Warnings:

  - You are about to drop the column `carrier` on the `ShippingProfile` table. All the data in the column will be lost.
  - You are about to drop the column `service` on the `ShippingProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "callsThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "keySuffix" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShippingProfile" DROP COLUMN "carrier",
DROP COLUMN "service",
ADD COLUMN     "handlingTimeDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxWeightLbs" DOUBLE PRECISION,
ADD COLUMN     "whoPays" TEXT NOT NULL DEFAULT 'seller';
