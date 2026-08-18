import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";

async function userFromKey(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const key = auth.slice(7).trim();
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { include: { usage: true } } },
  });
  if (!record) return null;
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return record.user;
}

async function createFromFormData(userId: string, data: ListingFormData) {
  const usage = await canCreateListing(userId);
  if (!usage.allowed) {
    return { error: usage.reason || "Listing limit reached" };
  }
  const { photos, tags, ...rest } = data;
  await prisma.listing.create({
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
  });
  await incrementListingUsage(userId);
  return { success: true };
}

export async function POST(request: Request) {
  const user = await userFromKey(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];
  const created = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const parsed = listingSchema.safeParse(items[i]);
    if (!parsed.success) {
      errors.push({ index: i, message: parsed.error.flatten() });
      continue;
    }
    const result = await createFromFormData(user.id, parsed.data);
    if ("error" in result) {
      errors.push({ index: i, message: result.error });
    } else {
      created.push(i);
    }
  }

  return NextResponse.json({ created: created.length, errors });
}
