"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { requireUserId } from "@/lib/auth-helpers";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function getApiKeys() {
  const userId = await requireUserId();
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      keySuffix: true,
      lastUsedAt: true,
      callsThisMonth: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

export async function createApiKey(name: string) {
  const userId = await requireUserId();
  const key = `pm_${crypto.randomBytes(32).toString("hex")}`;
  const record = await prisma.apiKey.create({
    data: { userId, name, keyHash: hashKey(key), keyPrefix: key.slice(0, 12), keySuffix: key.slice(-4) },
    select: { id: true, name: true, createdAt: true },
  });
  revalidatePath("/settings/api");
  return { success: true, apiKey: { ...record, key } };
}

/** Revoke, not delete -- a key stays visible (dimmed, badged) so "is this the one I already
 *  rotated out" stays answerable later. The auth check in app/api/v1/listings/route.ts rejects
 *  any key with revokedAt set. */
export async function revokeApiKey(id: string) {
  const userId = await requireUserId();
  await prisma.apiKey.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/settings/api");
  return { success: true };
}
