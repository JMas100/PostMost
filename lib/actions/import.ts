"use server";

import { revalidatePath } from "next/cache";
import { parse } from "papaparse";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { getActiveInventoryStatus, canImportCSV } from "@/lib/actions/usage";
import { safeFetchText, SafeFetchError, MAX_RESPONSE_BYTES } from "@/lib/safe-fetch";
import { requireWorkspace } from "@/lib/auth-helpers";

function normalizeKey(key: string): string {
  // Strips a trailing parenthetical (e.g. "Custom label (SKU)" -> "custom label") so exports
  // that annotate a column's purpose in parens still line up with our alias lists.
  return key.toLowerCase().trim().replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ");
}

export type ImportSource = "generic" | "ebay";

type FieldAliasMap = Record<keyof ListingFormData | "photos" | "description", string[]>;

const GENERIC_ALIASES: FieldAliasMap = {
  title: ["title", "name", "product title", "item title"],
  description: ["description", "desc", "body", "product description"],
  price: ["price", "selling price", "list price"],
  cost: ["cost", "cogs", "purchase cost", "item cost"],
  quantity: ["quantity", "qty", "stock"],
  condition: ["condition", "item condition"],
  category: ["category"],
  brand: ["brand"],
  size: ["size"],
  color: ["color"],
  material: ["material"],
  sku: ["sku", "item number", "product id"],
  tags: ["tags", "hashtags"],
  shippingProfileId: ["shipping profile id", "shipping profile", "shipping id"],
  photos: ["photos", "images", "photo urls", "image urls", "pictures"],
};

// eBay's Seller Hub "Active listings" report download uses these column names. Other
// marketplaces (Poshmark, Depop, etc.) don't have an official, stable CSV export format we can
// verify against, so we don't ship presets that would just be guesses at their layout — the
// generic aliases above already do reasonable fuzzy matching for those.
const EBAY_ALIASES: FieldAliasMap = {
  ...GENERIC_ALIASES,
  price: [...GENERIC_ALIASES.price, "start price", "current price", "buy it now price"],
  quantity: [...GENERIC_ALIASES.quantity, "available quantity"],
  sku: [...GENERIC_ALIASES.sku, "custom label"],
  category: [...GENERIC_ALIASES.category, "category name"],
  photos: [...GENERIC_ALIASES.photos, "photo url"],
};

const ALIASES_BY_SOURCE: Record<ImportSource, FieldAliasMap> = {
  generic: GENERIC_ALIASES,
  ebay: EBAY_ALIASES,
};

function getValue(row: Record<string, string>, names: string[]): string | undefined {
  const normalizedNames = names.map(normalizeKey);
  for (const [key, value] of Object.entries(row)) {
    if (normalizedNames.includes(normalizeKey(key)) && value !== undefined && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

function parsePhotos(row: Record<string, string>, aliases: FieldAliasMap): string[] {
  const photos: string[] = [];
  const photoKeys = Object.keys(row)
    .filter((k) => /^\s*photo\s*\d+\s*$/i.test(k))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  for (const key of photoKeys) {
    const value = row[key]?.trim();
    if (value) photos.push(value);
  }
  if (photos.length === 0) {
    const combined = getValue(row, aliases.photos);
    if (combined) {
      photos.push(...combined.split(/[|;]+/).map((u) => u.trim()).filter(Boolean));
    }
  }
  return photos;
}

function rowToListingFormData(row: Record<string, string>, aliases: FieldAliasMap): Partial<ListingFormData> {
  const price = getValue(row, aliases.price);
  const cost = getValue(row, aliases.cost);
  const quantity = getValue(row, aliases.quantity);

  return {
    title: getValue(row, aliases.title),
    description: getValue(row, aliases.description),
    price: price ? Number(price.replace(/[^0-9.]/g, "")) : undefined,
    cost: cost ? Number(cost.replace(/[^0-9.]/g, "")) : undefined,
    quantity: quantity ? Number(quantity) : undefined,
    condition: getValue(row, aliases.condition),
    category: getValue(row, aliases.category),
    brand: getValue(row, aliases.brand),
    size: getValue(row, aliases.size),
    color: getValue(row, aliases.color),
    material: getValue(row, aliases.material),
    sku: getValue(row, aliases.sku),
    tags: getValue(row, aliases.tags),
    shippingProfileId: getValue(row, aliases.shippingProfileId),
    photos: parsePhotos(row, aliases),
  };
}

export interface ImportResult {
  created: number;
  drafted: number;
  errors: { row: number; message: string }[];
}

async function runPublishImport(rows: Record<string, string>[], userId: string, aliases: FieldAliasMap): Promise<ImportResult> {
  const result: ImportResult = { created: 0, drafted: 0, errors: [] };

  // Fetched once instead of re-querying (and re-fetching the plan) before every single row --
  // quantity is always >= 1 for a validated row (listingSchema.quantity has .min(1).default(1)),
  // so every successful create below counts as exactly one more active listing against the same
  // running total, no per-row DB round trip needed to know that.
  const inventory = await getActiveInventoryStatus(userId);
  let activeCount = inventory.count;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const data = rowToListingFormData(rows[i], aliases);
    const { photos, tags, ...rest } = data;
    const photoUrls = photos && photos.length > 0 ? photos : [];

    const parsedData = listingSchema.safeParse({ ...rest, photos: photoUrls, tags } as ListingFormData);
    if (!parsedData.success) {
      result.errors.push({ row: rowNumber, message: "Missing or invalid required fields" });
      continue;
    }

    if (inventory.limit !== -1 && activeCount >= inventory.limit) {
      result.errors.push({
        row: rowNumber,
        message: `You've reached your ${inventory.limit}-item active inventory limit on the ${inventory.planName} plan.`,
      });
      continue;
    }

    await prisma.listing.create({
      data: {
        ...parsedData.data,
        tags: parsedData.data.tags || null,
        userId,
        status: "PUBLISHED",
        isDraft: false,
        photos: {
          create: parsedData.data.photos.map((url, index) => ({ url, order: index })),
        },
      },
    });
    activeCount += 1;
    result.created += 1;
  }

  return result;
}

async function runDraftImport(rows: Record<string, string>[], userId: string, aliases: FieldAliasMap): Promise<ImportResult> {
  // Batched instead of one create() per row: createManyAndReturn for the listings themselves
  // (no nested-relation support, so photos can't ride along in the same call), then a single
  // createMany for every row's photos at once, using the ids just returned -- two round trips
  // total instead of up to N, N being the row count.
  const rowsData = rows.map((row) => rowToListingFormData(row, aliases));

  const created = await prisma.listing.createManyAndReturn({
    data: rowsData.map((data) => ({
      title: data.title || "Untitled draft",
      description: data.description || "",
      condition: data.condition || "",
      category: data.category || "",
      brand: data.brand || null,
      size: data.size || null,
      color: data.color || null,
      material: data.material || null,
      price: typeof data.price === "number" ? data.price : 0,
      cost: typeof data.cost === "number" ? data.cost : null,
      quantity: typeof data.quantity === "number" ? data.quantity : 1,
      sku: data.sku || null,
      tags: data.tags || null,
      userId,
      status: "DRAFT",
      isDraft: true,
    })),
    select: { id: true },
  });

  const photoRows = created.flatMap((listing, i) =>
    (rowsData[i].photos || []).map((url, order) => ({ listingId: listing.id, url, order }))
  );
  if (photoRows.length > 0) {
    await prisma.photo.createMany({ data: photoRows });
  }

  return { created: 0, drafted: created.length, errors: [] };
}

async function runImport(
  csvText: string,
  userId: string,
  options: { publish?: boolean; source?: ImportSource }
): Promise<ImportResult> {
  const aliases = ALIASES_BY_SOURCE[options.source ?? "generic"];

  const parsed = parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { created: 0, drafted: 0, errors: [{ row: 0, message: "Failed to parse CSV." }] };
  }

  const result = options.publish
    ? await runPublishImport(parsed.data, userId, aliases)
    : await runDraftImport(parsed.data, userId, aliases);

  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return result;
}

export async function importCSV(
  csvText: string,
  options: { publish?: boolean; source?: ImportSource } = {}
): Promise<ImportResult> {
  const { workspaceUserId: userId } = await requireWorkspace();

  // The URL path (importFromUrl below) already caps at this size via safeFetchText -- this path
  // (pasted/uploaded text handed straight to a server action) had no bound at all, so a large
  // paste got parsed in full with no limit.
  if (Buffer.byteLength(csvText, "utf8") > MAX_RESPONSE_BYTES) {
    return { created: 0, drafted: 0, errors: [{ row: 0, message: `CSV is too large (max ${MAX_RESPONSE_BYTES / (1024 * 1024)}MB).` }] };
  }

  const gate = await canImportCSV(userId);
  if (!gate.allowed) {
    return { created: 0, drafted: 0, errors: [{ row: 0, message: gate.reason || "CSV import isn't available on your plan." }] };
  }

  return runImport(csvText, userId, options);
}

export async function importFromUrl(
  url: string,
  options: { publish?: boolean; source?: ImportSource } = {}
): Promise<ImportResult> {
  const { workspaceUserId: userId } = await requireWorkspace();

  const gate = await canImportCSV(userId);
  if (!gate.allowed) {
    return { created: 0, drafted: 0, errors: [{ row: 0, message: gate.reason || "CSV import isn't available on your plan." }] };
  }

  let csvText: string;
  try {
    csvText = await safeFetchText(url);
  } catch (err) {
    const message = err instanceof SafeFetchError ? err.message : "Couldn't fetch that URL.";
    return { created: 0, drafted: 0, errors: [{ row: 0, message }] };
  }

  return runImport(csvText, userId, options);
}
