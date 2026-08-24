"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";
import { track } from "@/lib/analytics/track";
import { requireUserId } from "@/lib/auth-helpers";

async function trackListingCompleted(userId: string, listingId: string) {
  await track("listing_completed", userId, { listingId });
  const count = await prisma.listing.count({ where: { userId, isDraft: false } });
  if (count === 2) {
    await track("second_listing_created", userId, { listingId });
  }
}

export async function getListings() {
  const userId = await requireUserId();
  return prisma.listing.findMany({
    where: { userId, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDrafts() {
  const userId = await requireUserId();
  return prisma.listing.findMany({
    where: { userId, isDraft: true },
    include: { photos: true, platformListings: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getListing(id: string) {
  const userId = await requireUserId();
  return prisma.listing.findFirst({
    where: { id, userId },
    include: { photos: true, platformListings: true, jobs: true },
  });
}

export async function createListing(data: ListingFormData) {
  const userId = await requireUserId();
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;

  const usage = await canCreateListing(userId);
  if (!usage.allowed) {
    return { error: usage.reason };
  }

  const listing = await prisma.listing.create({
    data: {
      ...rest,
      tags: tags || null,
      userId,
      status: "PUBLISHED",
      isDraft: false,
      photos: {
        create: photos.map((url, index) => ({ url, order: index })),
      },
    },
    include: { photos: true, platformListings: true },
  });

  await incrementListingUsage(userId);
  await trackListingCompleted(userId, listing.id);

  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return { success: true, listing };
}

const draftSchema = listingSchema.partial();

function normalizeDraft(data: Partial<ListingFormData>) {
  const parsed = draftSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;
  const price = typeof rest.price === "number" ? rest.price : 0;
  const quantity = typeof rest.quantity === "number" ? rest.quantity : 1;
  const cost = typeof rest.cost === "number" ? rest.cost : null;
  return {
    title: rest.title || "Untitled draft",
    description: rest.description || "",
    condition: rest.condition || "",
    category: rest.category || "",
    brand: rest.brand || null,
    size: rest.size || null,
    color: rest.color || null,
    material: rest.material || null,
    price,
    cost,
    quantity,
    sku: rest.sku || null,
    tags: tags || null,
    photoUrls: photos || [],
  };
}

export async function saveDraft(data: Partial<ListingFormData>, id?: string) {
  const userId = await requireUserId();

  const normalized = normalizeDraft(data);
  if ("error" in normalized) {
    return normalized;
  }

  const { photoUrls, ...draftData } = normalized;

  if (id) {
    const existing = await prisma.listing.findFirst({ where: { id, userId, isDraft: true } });
    if (!existing) return { error: "Draft not found" };
    const listing = await prisma.$transaction(async (tx) => {
      await tx.photo.deleteMany({ where: { listingId: id } });
      return tx.listing.update({
        where: { id },
        data: {
          ...draftData,
          isDraft: true,
          status: "DRAFT",
          photos: {
            create: photoUrls.map((url: string, index: number) => ({ url, order: index })),
          },
        },
        include: { photos: true, platformListings: true },
      });
    });
    revalidatePath(`/listings/${id}`);
    revalidatePath("/listings/drafts");
    return { success: true, listing };
  }

  const listing = await prisma.listing.create({
    data: {
      ...draftData,
      userId,
      isDraft: true,
      status: "DRAFT",
      photos: {
        create: photoUrls.map((url: string, index: number) => ({ url, order: index })),
      },
    },
    include: { photos: true, platformListings: true },
  });
  revalidatePath("/listings/drafts");
  revalidatePath("/listings");
  return { success: true, listing };
}

export async function publishDraft(id: string, data: ListingFormData) {
  const userId = await requireUserId();

  const existing = await prisma.listing.findFirst({ where: { id, userId, isDraft: true } });
  if (!existing) return { error: "Draft not found" };

  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;

  const usage = await canCreateListing(userId);
  if (!usage.allowed) {
    return { error: usage.reason };
  }

  const listing = await prisma.$transaction(async (tx) => {
    await tx.photo.deleteMany({ where: { listingId: id } });
    return tx.listing.update({
      where: { id },
      data: {
        ...rest,
        tags: tags || null,
        isDraft: false,
        status: "PUBLISHED",
        photos: {
          create: photos.map((url, index) => ({ url, order: index })),
        },
      },
      include: { photos: true, platformListings: true },
    });
  });

  await incrementListingUsage(userId);
  await trackListingCompleted(userId, listing.id);

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true, listing };
}

export async function updateListing(id: string, data: Partial<ListingFormData>) {
  const userId = await requireUserId();
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
  const userId = await requireUserId();
  await prisma.listing.deleteMany({ where: { id, userId } });
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bulkDeleteListings(ids: string[]) {
  const userId = await requireUserId();
  if (ids.length === 0) return { success: true, count: 0 };
  const result = await prisma.listing.deleteMany({ where: { id: { in: ids }, userId } });
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true, count: result.count };
}
