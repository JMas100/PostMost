"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUserId, requireWorkspace, requireRole } from "@/lib/auth-helpers";
import { normalizeEmail } from "@/lib/email";
import { sendTeamInviteEmail } from "@/lib/mail";
import { getEffectivePlan, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import { logAudit } from "@/lib/audit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Mirrors accounts.ts's canConnectMarketplace -- counts ACTIVE + PENDING members (a pending
 *  invite already reserves a seat, so it can't be undercounted by sending more invites than
 *  seats allow) against the owner's plan. */
async function canInviteTeamMember(ownerId: string, teamId: string): Promise<{ allowed: boolean; reason?: string }> {
  const [owner, memberCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: PLAN_ASSIGNMENT_SELECT }),
    prisma.teamMember.count({ where: { teamId, status: { in: ["ACTIVE", "PENDING"] } } }),
  ]);
  const plan = getEffectivePlan(owner);
  if (plan.seats === -1) return { allowed: true };
  if (memberCount < plan.seats) return { allowed: true };
  return {
    allowed: false,
    reason: `The ${plan.name} plan includes ${plan.seats} team seat${plan.seats === 1 ? "" : "s"}. Upgrade to invite more.`,
  };
}

export async function getTeam() {
  const ctx = await requireWorkspace();
  const team = await prisma.team.findFirst({
    where: { ownerId: ctx.workspaceUserId },
    include: { members: true },
  });
  return team;
}

/** Thin read for the client-side workspace indicator -- null for an OWNER (nothing to show),
 *  otherwise the role and a display name for whose workspace this is. */
export async function getWorkspaceContext() {
  const ctx = await requireWorkspace();
  if (ctx.role === "OWNER") return null;
  const owner = await prisma.user.findUnique({ where: { id: ctx.workspaceUserId }, select: { name: true, email: true } });
  return { role: ctx.role, ownerName: owner?.name || owner?.email || "the owner" };
}

export async function inviteTeamMember(email: string, role: "ADMIN" | "MEMBER" = "MEMBER") {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);

  const existingTeam = await prisma.team.findFirst({ where: { ownerId: ctx.workspaceUserId } });
  const team = existingTeam || (await prisma.team.create({ data: { ownerId: ctx.workspaceUserId, name: "My team" } }));

  const normalizedEmail = normalizeEmail(email);

  const existingMember = await prisma.teamMember.findUnique({
    where: { teamId_email: { teamId: team.id, email: normalizedEmail } },
  });
  if (existingMember?.status === "ACTIVE") {
    return { error: "This person is already an active team member. Change their role from the member list instead." };
  }

  const gate = await canInviteTeamMember(ctx.workspaceUserId, team.id);
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    if (existingUser.id === ctx.workspaceUserId) {
      return { error: "That's the workspace owner's own email." };
    }
    // Prevents a user from silently ending up on two workspaces at once -- requireWorkspace()
    // only ever resolves to one, so a second active membership would just make one of them
    // invisible to them with no explanation.
    const otherActiveMembership = await prisma.teamMember.findFirst({
      where: { userId: existingUser.id, status: "ACTIVE", teamId: { not: team.id } },
    });
    if (otherActiveMembership) {
      return { error: "This person is already part of another team's workspace." };
    }
  }

  // Every invite -- new email or existing PostMost user -- goes through the same PENDING +
  // emailed-token path. An existing user's account is real and verified, but *joining this
  // particular workspace* still needs their own consent: without this, inviting someone else's
  // email would silently redirect their entire session to a stranger's data next time they
  // loaded any page, with no notice at all.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = hashInviteToken(rawToken);
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const member = await prisma.teamMember.upsert({
    where: { teamId_email: { teamId: team.id, email: normalizedEmail } },
    create: {
      teamId: team.id,
      email: normalizedEmail,
      role,
      userId: existingUser?.id,
      status: "PENDING",
      inviteTokenHash,
      inviteTokenExpiresAt,
    },
    update: {
      role,
      userId: existingUser?.id,
      status: "PENDING",
      inviteTokenHash,
      inviteTokenExpiresAt,
    },
  });

  const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
  const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;
  try {
    await sendTeamInviteEmail(normalizedEmail, inviteUrl, team.name);
  } catch (err) {
    console.error("Failed to send team invite email:", err);
  }

  await logAudit(ctx, {
    action: "team.invited",
    targetType: "TeamMember",
    targetId: member.id,
    message: `Invited ${normalizedEmail} as ${role === "ADMIN" ? "an admin" : "a member"}`,
  });

  revalidatePath("/settings/team");
  return { success: true, member: { id: member.id, email: member.email, role: member.role, status: member.status } };
}

/** Changes an existing member's role in place -- unlike inviteTeamMember, never touches status
 *  or the invite token, so promoting/demoting an already-ACTIVE member doesn't bump them back
 *  to PENDING and force re-acceptance. */
export async function updateMemberRole(memberId: string, role: "ADMIN" | "MEMBER") {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const team = await prisma.team.findFirst({ where: { ownerId: ctx.workspaceUserId } });
  if (!team) return { error: "No team found" };
  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: team.id } });
  if (!target) return { error: "Member not found" };
  const result = await prisma.teamMember.updateMany({ where: { id: memberId, teamId: team.id }, data: { role } });
  if (result.count === 0) return { error: "Member not found" };
  await logAudit(ctx, {
    action: "team.role_changed",
    targetType: "TeamMember",
    targetId: memberId,
    message: `Changed ${target.email}'s role from ${target.role} to ${role}`,
  });
  revalidatePath("/settings/team");
  return { success: true };
}

export async function removeTeamMember(memberId: string) {
  const ctx = await requireWorkspace();
  const team = await prisma.team.findFirst({ where: { ownerId: ctx.workspaceUserId } });
  if (!team) return { error: "No team found" };

  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: team.id } });
  if (!target) return { error: "Member not found" };

  // A MEMBER can always remove themselves (leave) without needing an admin -- otherwise there'd
  // be no self-service way out of a workspace. Removing anyone else still needs OWNER/ADMIN.
  const isSelf = target.userId === ctx.actingUserId;
  if (!isSelf) {
    requireRole(ctx, ["OWNER", "ADMIN"]);
  }

  await prisma.teamMember.delete({ where: { id: target.id } });
  await logAudit(ctx, {
    action: "team.member_removed",
    targetType: "TeamMember",
    targetId: target.id,
    message: isSelf ? `${target.email} left the workspace` : `Removed ${target.email} from the team`,
  });
  revalidatePath("/settings/team");
  return { success: true };
}

/** Read-only lookup for the /accept-invite page to decide which flow to render, before the
 *  visitor is necessarily signed in. Only ever reveals what the token's holder already implies
 *  (the invited email, team name, and whether that email already has an account) -- the same
 *  trust boundary as any other token-gated lookup in this app (e.g. password reset). */
export async function getInviteInfo(token: string) {
  const member = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashInviteToken(token), status: "PENDING" },
    select: { email: true, userId: true, inviteTokenExpiresAt: true, team: { select: { name: true } } },
  });
  if (!member || !member.inviteTokenExpiresAt || member.inviteTokenExpiresAt < new Date()) {
    return null;
  }
  return { email: member.email, isExistingUser: Boolean(member.userId), teamName: member.team.name };
}

/** New-user path: the invited email had no PostMost account, so accepting creates one. */
export async function acceptTeamInvite(token: string, password: string) {
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const member = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashInviteToken(token), status: "PENDING" },
    include: { team: true },
  });
  if (!member || !member.inviteTokenExpiresAt || member.inviteTokenExpiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }

  // Someone may have registered this email directly (outside the invite) since it was sent --
  // don't silently attach a new account to their identity.
  const existingUser = await prisma.user.findUnique({ where: { email: member.email } });
  if (existingUser) {
    return { error: "An account for this email already exists. Log in and accept the invite from there instead." };
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

  await logAudit(
    { workspaceUserId: member.team.ownerId, actingUserId: user.id },
    { action: "team.member_joined", targetType: "TeamMember", targetId: member.id, message: `${member.email} accepted the invite and joined` }
  );

  return { success: true };
}

/** Existing-user path: the invited email already had a PostMost account, so there's no password
 *  to set -- the signed-in visitor just needs to confirm they're the invited person before their
 *  session gets pointed at the new workspace. */
export async function acceptExistingUserInvite(token: string) {
  const actingUserId = await requireUserId();

  const member = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashInviteToken(token), status: "PENDING" },
    include: { team: true },
  });
  if (!member || !member.inviteTokenExpiresAt || member.inviteTokenExpiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }
  if (member.userId !== actingUserId) {
    return { error: "This invite was sent to a different account. Sign in as the invited email to accept it." };
  }

  const otherActiveMembership = await prisma.teamMember.findFirst({
    where: { userId: actingUserId, status: "ACTIVE", teamId: { not: member.teamId } },
  });
  if (otherActiveMembership) {
    return { error: "You're already part of another team's workspace." };
  }

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { status: "ACTIVE", inviteTokenHash: null, inviteTokenExpiresAt: null },
  });

  await logAudit(
    { workspaceUserId: member.team.ownerId, actingUserId },
    { action: "team.member_joined", targetType: "TeamMember", targetId: member.id, message: `${member.email} accepted the invite and joined` }
  );

  return { success: true };
}
