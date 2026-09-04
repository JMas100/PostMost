"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { requireWorkspace } from "@/lib/auth-helpers";

const templateSchema = listingSchema.partial();

export async function getTemplates() {
  const { workspaceUserId: userId } = await requireWorkspace();
  // Usage count is the strongest signal of which template to reach for -- it earns the sort,
  // not recency.
  return prisma.template.findMany({
    where: { userId },
    orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
  });
}

/** Fired when a template is actually loaded into the composer (not just visible in the list) --
 *  the signal that it saved someone real typing, which is what the usage count is meant to
 *  track. */
export async function recordTemplateUsed(id: string) {
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.template.updateMany({
    where: { id, userId },
    data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
  });
  revalidatePath("/templates");
}

export async function saveTemplate(
  name: string,
  data: Partial<ListingFormData>,
  platforms?: string[]
): Promise<{ success: true; template: { id: string } } | { error: string }> {
  const { workspaceUserId: userId } = await requireWorkspace();

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.message || "Invalid template data" };
  }

  const template = await prisma.template.create({
    data: {
      userId,
      name,
      payload: JSON.stringify(parsed.data),
      platforms: platforms && platforms.length > 0 ? JSON.stringify(platforms) : null,
    },
  });
  revalidatePath("/listings/new");
  revalidatePath("/templates");
  return { success: true, template };
}

export async function updateTemplate(
  id: string,
  name: string,
  data: Partial<ListingFormData>,
  platforms?: string[]
): Promise<{ success: true } | { error: string }> {
  const { workspaceUserId: userId } = await requireWorkspace();

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.message || "Invalid template data" };
  }

  const result = await prisma.template.updateMany({
    where: { id, userId },
    data: {
      name,
      payload: JSON.stringify(parsed.data),
      platforms: platforms && platforms.length > 0 ? JSON.stringify(platforms) : null,
    },
  });
  if (result.count === 0) {
    return { error: "Template not found" };
  }

  revalidatePath("/listings/new");
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const { workspaceUserId: userId } = await requireWorkspace();
  await prisma.template.deleteMany({ where: { id, userId } });
  revalidatePath("/listings/new");
  revalidatePath("/templates");
  return { success: true };
}

export async function getTemplate(id: string) {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.template.findFirst({ where: { id, userId } });
}
