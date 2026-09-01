"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUserId } from "@/lib/auth-helpers";
import { normalizeEmail } from "@/lib/email";
import { sendTeamInviteEmail } from "@/lib/mail";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getTeam() {
  const userId = await requireUserId();
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    include: { members: true },
  });
  return team;
}

export async function inviteTeamMember(email: string, role: "ADMIN" | "MEMBER" = "MEMBER") {
  const userId = await requireUserId();

  const existing = await prisma.team.findFirst({ where: { ownerId: userId } });
  const team = existing || (await prisma.team.create({ data: { ownerId: userId, name: "My team" } }));

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Only an email with no PostMost account yet needs an invite token -- an existing account is
  // already a real, verified identity. The token is a real random secret (never the row's own
  // id) so possessing it is the only way to accept, and it's only ever emailed to the invited
  // address -- never returned here, since the inviter is not the person who's supposed to have it.
  let rawToken: string | undefined;
  let inviteTokenHash: string | undefined;
  let inviteTokenExpiresAt: Date | undefined;
  if (!existingUser) {
    rawToken = crypto.randomBytes(32).toString("hex");
    inviteTokenHash = hashInviteToken(rawToken);
    inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
  }

  const member = await prisma.teamMember.upsert({
    where: { teamId_email: { teamId: team.id, email: normalizedEmail } },
    create: {
      teamId: team.id,
      email: normalizedEmail,
      role,
      userId: existingUser?.id,
      status: existingUser ? "ACTIVE" : "PENDING",
      inviteTokenHash,
      inviteTokenExpiresAt,
    },
    update: existingUser
      ? { role }
      : { role, status: "PENDING", inviteTokenHash, inviteTokenExpiresAt },
  });

  if (rawToken) {
    const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
    const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;
    try {
      await sendTeamInviteEmail(normalizedEmail, inviteUrl, team.name);
    } catch (err) {
      console.error("Failed to send team invite email:", err);
    }
  }

  revalidatePath("/settings/team");
  return { success: true, member: { id: member.id, email: member.email, role: member.role, status: member.status } };
}

export async function removeTeamMember(memberId: string) {
  const userId = await requireUserId();
  const team = await prisma.team.findFirst({ where: { ownerId: userId } });
  if (!team) return { error: "No team found" };
  await prisma.teamMember.deleteMany({ where: { id: memberId, teamId: team.id } });
  revalidatePath("/settings/team");
  return { success: true };
}

export async function acceptTeamInvite(token: string, password: string) {
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const member = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashInviteToken(token), status: "PENDING" },
  });
  if (!member || !member.inviteTokenExpiresAt || member.inviteTokenExpiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }

  // Someone may have registered this email directly (outside the invite) since it was sent --
  // don't silently attach a new account to their identity.
  const existingUser = await prisma.user.findUnique({ where: { email: member.email } });
  if (existingUser) {
    return { error: "An account for this email already exists. Log in instead." };
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: member.email,
      password: hashed,
      role: member.role,
    },
  });

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { userId: user.id, status: "ACTIVE", inviteTokenHash: null, inviteTokenExpiresAt: null },
  });

  return { success: true };
}
