"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { sendPasswordResetEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_PER_EMAIL = 5;
const RESET_MAX_PER_IP = 10;
// resetPassword (the token-redemption step) isn't guessable in practice -- tokens are 256-bit --
// but it had no limiter at all before, unlike the request step above. This is defense-in-depth,
// not closing a practically exploitable hole.
const RESET_SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const RESET_SUBMIT_MAX_PER_IP = 20;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);

  // Rate-limited before ever touching the DB for the real user lookup, and still always
  // returns { success: true } either way -- same enumeration-safe contract as below, a block
  // just silently skips sending the email instead of revealing anything.
  const emailCheck = await checkRateLimit(`reset-email:${normalizedEmail}`, { windowMs: RESET_WINDOW_MS, max: RESET_MAX_PER_EMAIL });
  const ip = await getClientIp();
  const ipCheck = ip ? await checkRateLimit(`reset-ip:${ip}`, { windowMs: RESET_WINDOW_MS, max: RESET_MAX_PER_IP }) : { allowed: true };
  if (!emailCheck.allowed || !ipCheck.allowed) {
    return { success: true };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

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

  const ip = await getClientIp();
  if (ip) {
    const ipCheck = await checkRateLimit(`reset-submit-ip:${ip}`, { windowMs: RESET_SUBMIT_WINDOW_MS, max: RESET_SUBMIT_MAX_PER_IP });
    if (!ipCheck.allowed) {
      return { error: "Too many attempts. Please wait a bit and try again." };
    }
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
