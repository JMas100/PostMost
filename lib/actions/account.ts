"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-helpers";

export async function getAccount() {
  const userId = await requireUserId();
  return prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
}

export async function updateProfile(name: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name can't be empty" };

  await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
  revalidatePath("/settings/account");
  return { success: true };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const userId = await requireUserId();
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) return { error: "This account doesn't have a password set" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return { success: true };
}

/** Removes the PostMost account and everything scoped to it (listings, marketplace connections,
 *  templates, API keys, jobs...) via the same onDelete: Cascade relations every other delete in
 *  this app already relies on. Deliberately does NOT touch any marketplace: listings already live
 *  on eBay, Etsy, etc. stay live, because deleting a PostMost account is not the same action as
 *  asking a marketplace to take something down, and silently delisting a seller's live inventory
 *  on their way out would be a second, unrelated destructive action bundled into this one. */
export async function deleteAccount(currentPassword: string) {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found" };

  if (user.password) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return { error: "Current password is incorrect" };
  }

  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}
