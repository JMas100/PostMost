"use server";

import { revalidatePath } from "next/cache";
import { parse } from "papaparse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, " ");
}

const FIELD_ALIASES: Record<keyof ListingFormData | "photos" | "description", string[]> = {
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

function getValue(row: Record<string, string>, names: string[]): string | undefined {
  const normalizedNames = names.map(normalizeKey);
  for (const [key, value] of Object.entries(row)) {
    if (normalizedNames.includes(normalizeKey(key)) && value !== undefined && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

function parsePhotos(row: Record<string, string>): string[] {
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
    const combined = getValue(row, FIELD_ALIASES.photos);
    if (combined) {
      photos.push(...combined.split(/[|;]+/).map((u) => u.trim()).filter(Boolean));
    }
  }
  return photos;
}

function rowToListingFormData(row: Record<string, string>): Partial<ListingFormData> {
  const price = getValue(row, FIELD_ALIASES.price);
  const cost = getValue(row, FIELD_ALIASES.cost);
  const quantity = getValue(row, FIELD_ALIASES.quantity);

  return {
    title: getValue(row, FIELD_ALIASES.title),
    description: getValue(row, FIELD_ALIASES.description),
    price: price ? Number(price.replace(/[^0-9.]/g, "")) : undefined,
    cost: cost ? Number(cost.replace(/[^0-9.]/g, "")) : undefined,
    quantity: quantity ? Number(quantity) : undefined,
    condition: getValue(row, FIELD_ALIASES.condition),
    category: getValue(row, FIELD_ALIASES.category),
    brand: getValue(row, FIELD_ALIASES.brand),
    size: getValue(row, FIELD_ALIASES.size),
    color: getValue(row, FIELD_ALIASES.color),
    material: getValue(row, FIELD_ALIASES.material),
    sku: getValue(row, FIELD_ALIASES.sku),
    tags: getValue(row, FIELD_ALIASES.tags),
    shippingProfileId: getValue(row, FIELD_ALIASES.shippingProfileId),
    photos: parsePhotos(row),
  };
}

export interface ImportResult {
  created: number;
  drafted: number;
  errors: { row: number; message: string }[];
}

export async function importCSV(csvText: string, options: { publish?: boolean } = {}): Promise<ImportResult> {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const parsed = parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { created: 0, drafted: 0, errors: [{ row: 0, message: "Failed to parse CSV." }] };
  }

  const result: ImportResult = { created: 0, drafted: 0, errors: [] };

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNumber = i + 2; // header is row 1
    const data = rowToListingFormData(row);

    const { photos, tags, ...rest } = data;
    const photoUrls = photos && photos.length > 0 ? photos : [];

    if (options.publish) {
      const parsedData = listingSchema.safeParse({ ...rest, photos: photoUrls, tags } as ListingFormData);
      if (!parsedData.success) {
        result.errors.push({ row: rowNumber, message: "Missing or invalid required fields" });
        continue;
      }

      const usage = await canCreateListing(userId);
      if (!usage.allowed) {
        result.errors.push({ row: rowNumber, message: usage.reason || "Listing limit reached" });
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
      await incrementListingUsage(userId);
      result.created += 1;
    } else {
      const title = data.title || "Untitled draft";
      await prisma.listing.create({
        data: {
          title,
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
          photos: {
            create: photoUrls.map((url, index) => ({ url, order: index })),
          },
        },
      });
      result.drafted += 1;
    }
  }

  revalidatePath("/listings");
  revalidatePath("/listings/drafts");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return result;
}
