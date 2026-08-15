-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;
