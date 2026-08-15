"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getListings() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.listing.findMany({
    where: { userId },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getListing(id: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.listing.findFirst({
    where: { id, userId },
    include: { photos: true, platformListings: true, jobs: true },
  });
}

export async function createListing(data: ListingFormData) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;
  const listing = await prisma.listing.create({
    data: {
      ...rest,
      tags: tags || null,
      userId,
      photos: {
        create: photos.map((url, index) => ({ url, order: index })),
      },
    },
    include: { photos: true, platformListings: true },
  });
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return { success: true, listing };
}

export async function updateListing(id: string, data: Partial<ListingFormData>) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const existing = await prisma.listing.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Listing not found" };

  const parsed = listingSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest, tags: tags ?? existing.tags };
  if (photos) {
    await prisma.photo.deleteMany({ where: { listingId: id } });
    (updateData as { photos?: object }).photos = {
      create: photos.map((url, index) => ({ url, order: index })),
    };
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: updateData,
    include: { photos: true, platformListings: true },
  });
  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  return { success: true, listing };
}

export async function deleteListing(id: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  await prisma.listing.deleteMany({ where: { id, userId } });
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return { success: true };
}
