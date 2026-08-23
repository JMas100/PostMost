"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";

export async function getShippingProfiles() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.shippingProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDefaultShippingProfile(userId?: string) {
  const session = await getServerSession(authOptions);
  const id = userId || getUserId(session);
  return prisma.shippingProfile.findFirst({ where: { userId: id, isDefault: true } });
}

export async function createShippingProfile(data: { name: string; carrier: string; service: string; cost: number; isDefault?: boolean }) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const isDefault = !!data.isDefault;
  if (isDefault) {
    await prisma.shippingProfile.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const profile = await prisma.shippingProfile.create({
    data: { ...data, isDefault, userId },
  });
  revalidatePath("/settings/shipping");
  return { success: true, profile };
}

export async function updateShippingProfile(id: string, data: { name: string; carrier: string; service: string; cost: number; isDefault?: boolean }) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const existing = await prisma.shippingProfile.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Profile not found" };

  const isDefault = !!data.isDefault;
  if (isDefault && !existing.isDefault) {
    await prisma.shippingProfile.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const profile = await prisma.shippingProfile.update({
    where: { id },
    data: { ...data, isDefault },
  });
  revalidatePath("/settings/shipping");
  return { success: true, profile };
}

export async function deleteShippingProfile(id: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  await prisma.shippingProfile.deleteMany({ where: { id, userId } });
  revalidatePath("/settings/shipping");
  return { success: true };
}
