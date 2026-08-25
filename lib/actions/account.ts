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
