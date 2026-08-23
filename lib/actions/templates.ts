"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/auth-helpers";

const templateSchema = listingSchema.partial();

export async function getTemplates() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.template.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveTemplate(
  name: string,
  data: Partial<ListingFormData>
): Promise<{ success: true; template: { id: string } } | { error: string }> {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

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
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  await prisma.template.deleteMany({ where: { id, userId } });
  revalidatePath("/listings/new");
  revalidatePath("/templates");
  return { success: true };
}

export async function getTemplate(id: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.template.findFirst({ where: { id, userId } });
}
