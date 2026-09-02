-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "secondaryActionLabel" TEXT,
    "secondaryActionHref" TEXT,
    "platform" TEXT,
    "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soldApp" BOOLEAN NOT NULL DEFAULT true,
    "soldEmail" BOOLEAN NOT NULL DEFAULT true,
    "crossPostFailedEmail" BOOLEAN NOT NULL DEFAULT true,
    "marketplaceSignedOutEmail" BOOLEAN NOT NULL DEFAULT true,
    "automationRanApp" BOOLEAN NOT NULL DEFAULT true,
    "automationRanEmail" BOOLEAN NOT NULL DEFAULT false,
    "crossPostSucceededApp" BOOLEAN NOT NULL DEFAULT true,
    "crossPostSucceededEmail" BOOLEAN NOT NULL DEFAULT false,
    "nearPlanLimitApp" BOOLEAN NOT NULL DEFAULT true,
    "nearPlanLimitEmail" BOOLEAN NOT NULL DEFAULT false,
    "digestMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_category_resolvedAt_createdAt_idx" ON "Notification"("userId", "category", "resolvedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_groupKey_key" ON "Notification"("userId", "groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

