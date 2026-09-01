"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";
import { track } from "@/lib/analytics/track";
import { requireWorkspace, requireRole } from "@/lib/auth-helpers";
import { queueRepriceJobs } from "@/lib/actions/crosspost";
import { previewBulkPrice, type BulkPriceRule, type BulkPriceResult } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";

/** `actingUserId` for the tracked event (who actually did it, for engagement signal);
 *  `workspaceUserId` for the milestone count (the workspace's total, not just this person's). */
async function trackListingCompleted(actingUserId: string, workspaceUserId: string, listingId: string) {
  await track("listing_completed", actingUserId, { listingId });
  const count = await prisma.listing.count({ where: { userId: workspaceUserId, isDraft: false } });
  if (count === 2) {
    await track("second_listing_created", actingUserId, { listingId });
  }
}

export async function getListings() {
  const { workspaceUserId } = await requireWorkspace();
  return prisma.listing.findMany({
    where: { userId: workspaceUserId, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDrafts() {
  const { workspaceUserId } = await requireWorkspace();
  return prisma.listing.findMany({
    where: { userId: workspaceUserId, isDraft: true },
    include: { photos: true, platformListings: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getListing(id: string) {
  const { workspaceUserId } = await requireWorkspace();
  return prisma.listing.findFirst({
    where: { id, userId: workspaceUserId },
    include: { photos: true, platformListings: true, jobs: true },
  });
}

export async function createListing(data: ListingFormData) {
  const { actingUserId, workspaceUserId } = await requireWorkspace();
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;

  const usage = await canCreateListing(workspaceUserId);
  if (!usage.allowed) {
    return { error: usage.reason };
  }

  const listing = await prisma.listing.create({
    data: {
      ...rest,
      tags: tags || null,
      userId: workspaceUserId,
      status: "PUBLISHED",
      isDraft: false,
      photos: {
        create: photos.map((url, index) => ({ url, order: index })),
      },
    },
    include: { photos: true, platformListings: true },
  });

  await incrementListingUsage(workspaceUserId);
  await trackListingCompleted(actingUserId, workspaceUserId, listing.id);
  await logAudit(
    { workspaceUserId, actingUserId },
    { action: "listing.created", targetType: "Listing", targetId: listing.id, message: `Created "${listing.title}"` }
  );

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
  const { workspaceUserId } = await requireWorkspace();

  const normalized = normalizeDraft(data);
  if ("error" in normalized) {
    return normalized;
  }

  const { photoUrls, ...draftData } = normalized;

  if (id) {
    const existing = await prisma.listing.findFirst({ where: { id, userId: workspaceUserId, isDraft: true } });
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
      userId: workspaceUserId,
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
  const { actingUserId, workspaceUserId } = await requireWorkspace();

  const existing = await prisma.listing.findFirst({ where: { id, userId: workspaceUserId, isDraft: true } });
  if (!existing) return { error: "Draft not found" };

  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }
  const { photos, tags, ...rest } = parsed.data;

  const usage = await canCreateListing(workspaceUserId);
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

  await incrementListingUsage(workspaceUserId);
  await trackListingCompleted(actingUserId, workspaceUserId, listing.id);
  await logAudit(
    { workspaceUserId, actingUserId },
    { action: "listing.created", targetType: "Listing", targetId: listing.id, message: `Published draft "${listing.title}"` }
  );

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true, listing };
}

export async function updateListing(id: string, data: Partial<ListingFormData>) {
  const { workspaceUserId } = await requireWorkspace();
  const existing = await prisma.listing.findFirst({ where: { id, userId: workspaceUserId } });
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
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const listing = await prisma.listing.findFirst({ where: { id, userId: ctx.workspaceUserId }, select: { title: true } });
  const result = await prisma.listing.deleteMany({ where: { id, userId: ctx.workspaceUserId } });
  if (result.count > 0 && listing) {
    await logAudit(ctx, { action: "listing.deleted", targetType: "Listing", targetId: id, message: `Deleted "${listing.title}"` });
  }
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bulkDeleteListings(ids: string[]) {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  if (ids.length === 0) return { success: true, count: 0 };
  const result = await prisma.listing.deleteMany({ where: { id: { in: ids }, userId: ctx.workspaceUserId } });
  if (result.count > 0) {
    await logAudit(ctx, {
      action: "listing.deleted",
      targetType: "Listing",
      message: `Deleted ${result.count} listing${result.count === 1 ? "" : "s"} in bulk`,
    });
  }
  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  return { success: true, count: result.count };
}

/** A narrow, single-field update for the Inventory cost column editor -- unlike updateListing,
 *  this never touches photos or re-validates the whole record, so it's cheap enough to fire on
 *  every Tab/blur without lag. */
export async function setCost(id: string, cost: number) {
  const { workspaceUserId } = await requireWorkspace();
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: "Cost must be a non-negative number" };
  }
  const result = await prisma.listing.updateMany({ where: { id, userId: workspaceUserId }, data: { cost } });
  if (result.count === 0) return { error: "Listing not found" };
  revalidatePath("/inventory");
  revalidatePath(`/listings/${id}`);
  return { success: true };
}

export type { PriceChange, BulkPriceRule, BulkPriceResult } from "@/lib/pricing";

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
  const { workspaceUserId } = await requireWorkspace();
  if (ids.length === 0) return { success: true, results: [], appliedCount: 0, skippedCount: 0, queuedRepriceJobs: 0 };

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids }, userId: workspaceUserId },
    select: { id: true, title: true, price: true, cost: true },
  });

  const results: BulkPriceResult[] = listings.map((listing) => previewBulkPrice(listing, rule));
  const toApply = results
    .filter((r): r is BulkPriceResult & { status: "applied" } => r.status === "applied")
    .map((r) => ({ id: r.id, price: r.newPrice }));

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
