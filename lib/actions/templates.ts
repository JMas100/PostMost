"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { requireUserId } from "@/lib/auth-helpers";

const templateSchema = listingSchema.partial();

export async function getTemplates() {
  const userId = await requireUserId();
  return prisma.template.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveTemplate(
  name: string,
  data: Partial<ListingFormData>
): Promise<{ success: true; template: { id: string } } | { error: string }> {
  const userId = await requireUserId();

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.message || "Invalid template data" };
  }

  const template = await prisma.template.create({
    data: {
      userId,
      name,
      payload: JSON.stringify(parsed.data),
    },
  });
  revalidatePath("/listings/new");
  revalidatePath("/templates");
  return { success: true, template };
}

export async function deleteTemplate(id: string) {
  const userId = await requireUserId();
  await prisma.template.deleteMany({ where: { id, userId } });
  revalidatePath("/listings/new");
  revalidatePath("/templates");
  return { success: true };
}

export async function getTemplate(id: string) {
  const userId = await requireUserId();
  return prisma.template.findFirst({ where: { id, userId } });
}
