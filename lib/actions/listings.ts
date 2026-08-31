"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";
import { track } from "@/lib/analytics/track";
import { requireUserId } from "@/lib/auth-helpers";
import { queueRepriceJobs } from "@/lib/actions/crosspost";

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

/** A narrow, single-field update for the Inventory cost column editor -- unlike updateListing,
 *  this never touches photos or re-validates the whole record, so it's cheap enough to fire on
 *  every Tab/blur without lag. */
export async function setCost(id: string, cost: number) {
  const userId = await requireUserId();
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: "Cost must be a non-negative number" };
  }
  const result = await prisma.listing.updateMany({ where: { id, userId }, data: { cost } });
  if (result.count === 0) return { error: "Listing not found" };
  revalidatePath("/inventory");
  revalidatePath(`/listings/${id}`);
  return { success: true };
}

export type PriceChange =
  | { type: "percentage"; percent: number }
  | { type: "amount"; amount: number }
  | { type: "set"; value: number };

export interface BulkPriceRule {
  change: PriceChange;
  /** Skip any row whose computed new price would fall below cost * (1 + floorMarginPercent / 100).
   *  A row with no cost on file is also skipped when this is set, since the floor can't be
   *  checked without one -- "skip, don't block": the rest of the batch still applies. */
  floorMarginPercent?: number;
}

export interface BulkPriceResult {
  id: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  status: "applied" | "skipped";
  reason?: string;
}

function computeNewPrice(oldPrice: number, change: PriceChange): number {
  switch (change.type) {
    case "percentage":
      return Math.max(0, oldPrice * (1 - change.percent / 100));
    case "amount":
      return Math.max(0, oldPrice - change.amount);
    case "set":
      return Math.max(0, change.value);
  }
}

/** Applies a single price rule across a selection, previewing every row's result before
 *  committing anything. Rows that would breach the cost floor are skipped and reported with a
 *  reason rather than blocking the batch -- the other rows still apply. Only Listing.price is
 *  touched here: a listing with a per-marketplace override (PlatformListing.price set) keeps it,
 *  since this never writes to PlatformListing directly.
 *
 *  Pushing the new price out to every live marketplace is opt-in via `pushToMarketplaces` --
 *  crosslisting means the same item can be live in several places at once, so silently repricing
 *  everywhere on every internal price edit would be surprising. When set, queues a REPRICE job
 *  (same job queue publish/delist use) for each applied listing's currently-POSTED, non-overridden
 *  platform listings, skipping any platform whose adapter doesn't support automated price updates
 *  yet -- see queueRepriceJobs in lib/actions/crosspost.ts. */
export async function bulkUpdatePrice(
  ids: string[],
  rule: BulkPriceRule,
  options?: { pushToMarketplaces?: boolean }
): Promise<
  { success: true; results: BulkPriceResult[]; appliedCount: number; skippedCount: number; queuedRepriceJobs: number } | { error: string }
> {
  const userId = await requireUserId();
  if (ids.length === 0) return { success: true, results: [], appliedCount: 0, skippedCount: 0, queuedRepriceJobs: 0 };

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, title: true, price: true, cost: true },
  });

  const results: BulkPriceResult[] = [];
  const toApply: { id: string; price: number }[] = [];

  for (const listing of listings) {
    const newPrice = Math.round(computeNewPrice(listing.price, rule.change) * 100) / 100;

    if (rule.floorMarginPercent != null) {
      if (listing.cost == null) {
        results.push({
          id: listing.id,
          title: listing.title,
          oldPrice: listing.price,
          newPrice,
          status: "skipped",
          reason: "No cost on file to check the price floor against",
        });
        continue;
      }
      const floor = listing.cost * (1 + rule.floorMarginPercent / 100);
      if (newPrice < floor) {
        results.push({
          id: listing.id,
          title: listing.title,
          oldPrice: listing.price,
          newPrice,
          status: "skipped",
          reason: `Would fall below cost + ${rule.floorMarginPercent}%`,
        });
        continue;
      }
    }

    results.push({ id: listing.id, title: listing.title, oldPrice: listing.price, newPrice, status: "applied" });
    toApply.push({ id: listing.id, price: newPrice });
  }

  if (toApply.length > 0) {
    await prisma.$transaction(toApply.map((row) => prisma.listing.update({ where: { id: row.id }, data: { price: row.price } })));
  }

  let queuedRepriceJobs = 0;
  if (options?.pushToMarketplaces && toApply.length > 0) {
    const queued = await queueRepriceJobs(toApply.map((row) => row.id));
    queuedRepriceJobs = "queued" in queued ? queued.queued : 0;
  }

  revalidatePath("/listings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return {
    success: true,
    results,
    appliedCount: toApply.length,
    skippedCount: results.length - toApply.length,
    queuedRepriceJobs,
  };
}
