"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics/track";
import { normalizeEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, peekRateLimitRemaining } from "@/lib/rate-limit";
import { LOGIN_WINDOW_MS, LOGIN_MAX_PER_EMAIL } from "@/lib/auth";

const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_PER_IP = 8;

export async function registerUser(email: string, password: string, name?: string) {
  const ip = await getClientIp();
  if (ip) {
    const ipCheck = await checkRateLimit(`signup-ip:${ip}`, { windowMs: SIGNUP_WINDOW_MS, max: SIGNUP_MAX_PER_IP });
    if (!ipCheck.allowed) {
      return { error: "Too many signup attempts from this connection. Please try again later." };
    }
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "User already exists" };
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, password: hashed, name: name || null },
  });
  await track("signup_completed", user.id, { email: user.email });
  return { success: true, user: { id: user.id, email: user.email, name: user.name } };
}

/** NextAuth's credentials provider collapses every authorize() failure to a fixed
 *  "CredentialsSignin" string client-side (see node_modules/next-auth/core/routes/callback.js) --
 *  there's no way to thread a real remaining-attempts count through signIn() itself. This reads
 *  the same rate-limit bucket authorize() just wrote to, so the login page can show one instead
 *  of a fabricated number. */
export async function getLoginAttemptsRemaining(email: string) {
  const remaining = await peekRateLimitRemaining(`login-email:${normalizeEmail(email)}`, {
    windowMs: LOGIN_WINDOW_MS,
    max: LOGIN_MAX_PER_EMAIL,
  });
  return remaining;
}
