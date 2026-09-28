-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "categoryPath" TEXT[] DEFAULT ARRAY[]::TEXT[];
