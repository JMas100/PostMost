"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";

export async function getShippingProfiles() {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.shippingProfile.findMany({
    where: { userId },
    // A profile is abstract until you know how many listings depend on it -- that's also what
    // makes deleting one safe to reason about.
    include: { _count: { select: { listings: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDefaultShippingProfile(userId?: string) {
  const id = userId || (await requireWorkspace()).workspaceUserId;
  return prisma.shippingProfile.findFirst({ where: { userId: id, isDefault: true } });
}

export async function createShippingProfile(data: { name: string; carrier: string; service: string; cost: number; isDefault?: boolean }) {
  const { workspaceUserId: userId } = await requireWorkspace();

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
  const { workspaceUserId: userId } = await requireWorkspace();

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
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.shippingProfile.deleteMany({ where: { id, userId } });
  revalidatePath("/settings/shipping");
  return { success: true };
}
