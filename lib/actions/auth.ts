"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics/track";
import { normalizeEmail } from "@/lib/email";

export async function registerUser(email: string, password: string, name?: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "User already exists" };
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, password: hashed, name: name || null },
  });
  await track("signup_completed", user.id, { email: user.email });
  return { success: true, user: { id: user.id, email: user.email, name: user.name } };
}
