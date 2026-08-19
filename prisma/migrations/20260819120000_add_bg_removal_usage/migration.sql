-- AlterTable
ALTER TABLE "UserUsage" ADD COLUMN     "bgRemovalsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "studioBgRemovalsUsed" INTEGER NOT NULL DEFAULT 0;
