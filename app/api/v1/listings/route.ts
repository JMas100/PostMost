import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { canCreateListing, incrementListingUsage } from "@/lib/actions/usage";
import { resolveWorkspaceForUser, WorkspaceContext } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

async function workspaceFromKey(request: Request): Promise<WorkspaceContext | null> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const key = auth.slice(7).trim();
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const record = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!record) return null;
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  // A team member's own personal API key still creates listings in the shared workspace they
  // belong to, not a separate personal account -- matches how every other creation path
  // (the app's own UI, CSV import) already resolves through requireWorkspace().
  return resolveWorkspaceForUser(record.userId);
}

async function createFromFormData(ctx: WorkspaceContext, data: ListingFormData) {
  const usage = await canCreateListing(ctx.workspaceUserId);
  if (!usage.allowed) {
    return { error: usage.reason || "Listing limit reached" };
  }
  const { photos, tags, ...rest } = data;
  const listing = await prisma.listing.create({
    data: {
      ...rest,
      tags: tags || null,
      userId: ctx.workspaceUserId,
      status: "PUBLISHED",
      isDraft: false,
      photos: {
        create: photos.map((url, index) => ({ url, order: index })),
      },
    },
  });
  await incrementListingUsage(ctx.workspaceUserId);
  await logAudit(ctx, { action: "listing.created", targetType: "Listing", targetId: listing.id, message: `Created "${listing.title}" via the API` });
  return { success: true };
}

export async function POST(request: Request) {
  const ctx = await workspaceFromKey(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const result = await createFromFormData(ctx, parsed.data);
    if ("error" in result) {
      errors.push({ index: i, message: result.error });
    } else {
      created.push(i);
    }
  }

  return NextResponse.json({ created: created.length, errors });
}
