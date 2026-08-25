-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planOverride" TEXT,
ADD COLUMN     "planOverrideExpiresAt" TIMESTAMP(3);
