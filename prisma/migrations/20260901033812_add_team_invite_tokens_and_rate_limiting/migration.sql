-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "inviteTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteTokenHash" TEXT;

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_inviteTokenHash_key" ON "TeamMember"("inviteTokenHash");

