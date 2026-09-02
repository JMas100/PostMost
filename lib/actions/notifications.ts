"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";
import type { NotificationCategory } from "@/lib/notifications";

/** All queries and writes go through requireWorkspace() like every other data action, so a
 *  MEMBER sees (and can mark read) the same workspace notifications the OWNER does -- these
 *  live at the workspace-owner level, not per acting user. */
export async function getNotifications(category?: NotificationCategory) {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.notification.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
      // A needs_you row disappears from every list once the state it describes has actually
      // cleared; sales/activity rows never set resolvedAt, so this only ever filters needs_you.
      resolvedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Count-only query for the bell badge -- needs_you is the only category that ever reaches it
 *  (see lib/notifications.ts's category doc comment). */
export async function getUnreadNeedsYouCount() {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.notification.count({
    where: { userId, category: "needs_you", resolvedAt: null, readAt: null },
  });
}

export async function markRead(id: string) {
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function markAllRead() {
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/** Lazily creates a default-valued row on first read -- there's no signup hook that provisions
 *  one, so most users won't have a row until they visit Settings → Notifications, and every
 *  field already defaults to the spec's stated defaults (schema-level, not duplicated here). */
export async function getPreferences() {
  const { workspaceUserId: userId } = await requireWorkspace();
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId } });
}

export type UpdatablePreferences = Partial<
  Omit<
    Awaited<ReturnType<typeof getPreferences>>,
    "id" | "userId" | "createdAt" | "updatedAt"
  >
>;

export async function updatePreferences(updates: UpdatablePreferences) {
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...updates },
    update: updates,
  });
  revalidatePath("/settings/notifications");
}
