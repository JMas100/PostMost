"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUserId } from "@/lib/auth-helpers";
import { normalizeEmail } from "@/lib/email";

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
  const member = await prisma.teamMember.upsert({
    where: { teamId_email: { teamId: team.id, email: normalizedEmail } },
    create: {
      teamId: team.id,
      email: normalizedEmail,
      role,
      userId: existingUser?.id,
      status: existingUser ? "ACTIVE" : "PENDING",
    },
    update: { role },
  });

  revalidatePath("/settings/team");
  return { success: true, member };
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
  const member = await prisma.teamMember.findFirst({ where: { id: token, status: "PENDING" } });
  if (!member) return { error: "Invalid or expired invite" };

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
    data: { userId: user.id, status: "ACTIVE" },
  });

  return { success: true };
}
