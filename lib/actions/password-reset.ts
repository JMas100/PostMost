"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { sendPasswordResetEmail } from "@/lib/mail";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  // Whether the account exists is never revealed by this response -- confirming/denying it
  // here would let anyone enumerate registered emails one guess at a time.
  if (user?.password) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
    const resetUrl = `${origin}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
