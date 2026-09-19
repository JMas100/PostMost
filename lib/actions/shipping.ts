"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";

export async function getShippingProfiles() {
  const { workspaceUserId: userId } = await requireWorkspace();
  const profiles = await prisma.shippingProfile.findMany({
    where: { userId },
    // A profile is abstract until you know how many listings depend on it -- that's also what
    // makes deleting one safe to reason about.
    include: { _count: { select: { listings: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (profiles.length === 0) return profiles.map((p) => ({ ...p, platforms: [] as string[] }));

  // A profile is also abstract until you know *which marketplaces* actually depend on it, not
  // just how many listings -- one query for every profile's distinct platforms, grouped in JS
  // rather than N queries per profile.
  const platformRows = await prisma.platformListing.findMany({
    where: { listing: { shippingProfileId: { in: profiles.map((p) => p.id) }, userId } },
    select: { platform: true, listing: { select: { shippingProfileId: true } } },
    distinct: ["platform", "listingId"],
  });
  const platformsByProfile = new Map<string, Set<string>>();
  for (const row of platformRows) {
    const profileId = row.listing?.shippingProfileId;
    if (!profileId) continue;
    const set = platformsByProfile.get(profileId) ?? new Set<string>();
    set.add(row.platform);
    platformsByProfile.set(profileId, set);
  }

  return profiles.map((p) => ({ ...p, platforms: Array.from(platformsByProfile.get(p.id) ?? []) }));
}

export async function getDefaultShippingProfile(userId?: string) {
  const id = userId || (await requireWorkspace()).workspaceUserId;
  return prisma.shippingProfile.findFirst({ where: { userId: id, isDefault: true } });
}

interface ShippingProfileInput {
  name: string;
  whoPays: string;
  cost: number;
  handlingTimeDays: number;
  maxWeightLbs: number | null;
  isDefault?: boolean;
}

export async function createShippingProfile(data: ShippingProfileInput) {
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

export async function updateShippingProfile(id: string, data: ShippingProfileInput) {
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
