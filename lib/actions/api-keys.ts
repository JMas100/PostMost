"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getApiKeys() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, key: true, lastUsedAt: true, createdAt: true },
  });
}

export async function createApiKey(name: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const key = `pm_${crypto.randomBytes(32).toString("hex")}`;
  const record = await prisma.apiKey.create({
    data: { userId, name, key },
    select: { id: true, name: true, key: true, createdAt: true },
  });
  revalidatePath("/settings/api");
  return { success: true, apiKey: record };
}

export async function deleteApiKey(id: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  await prisma.apiKey.deleteMany({ where: { id, userId } });
  revalidatePath("/settings/api");
  return { success: true };
}
