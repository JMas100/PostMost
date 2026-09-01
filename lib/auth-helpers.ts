import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Extracts the signed-in user's id from a NextAuth session, throwing for server actions
 *  that require auth (the exception surfaces as a rejected action call on the client). */
export function getUserId(session: { user?: { id?: string } } | null): string {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Fetches the current session and extracts the user id in one call -- the pattern nearly
 *  every server action opens with. Throws the same way getUserId does when signed out. */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  return getUserId(session);
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface WorkspaceContext {
  /** The real signed-in user. */
  actingUserId: string;
  /** Whose data to read/write -- the team owner's id if the acting user is an active member,
   *  otherwise the same as actingUserId. */
  workspaceUserId: string;
  role: WorkspaceRole;
}

/** Resolves an already-known user id into a workspace: their own data if they're not on
 *  anyone's team, or the team owner's data (with their role on that team) if they are. Role is
 *  always read fresh from TeamMember here, never cached -- so a promotion, demotion, or removal
 *  takes effect on the very next call instead of waiting for a session refresh. `orderBy` is
 *  defense-in-depth: nothing currently prevents a user being an active member of more than one
 *  team, so this keeps the resolution deterministic if that ever happens rather than picking
 *  whichever row Postgres returns first.
 *
 *  Split out from requireWorkspace() so the external API (authenticated by an ApiKey bearer
 *  token, not a session) can resolve the key owner's workspace the same way the app's own
 *  session-based server actions do, instead of writing under the key owner's raw personal
 *  account -- see app/api/v1/listings/route.ts. */
export async function resolveWorkspaceForUser(actingUserId: string): Promise<WorkspaceContext> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId: actingUserId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { team: true },
  });
  if (membership) {
    return { actingUserId, workspaceUserId: membership.team.ownerId, role: membership.role as "ADMIN" | "MEMBER" };
  }
  return { actingUserId, workspaceUserId: actingUserId, role: "OWNER" };
}

/** Resolves the signed-in user into a workspace -- see resolveWorkspaceForUser() for the
 *  underlying logic. Throws the same way requireUserId does when signed out. */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const actingUserId = await requireUserId();
  return resolveWorkspaceForUser(actingUserId);
}

/** Throws unless the workspace context's role is one of `allowed`. Use after requireWorkspace()
 *  to gate actions a MEMBER (or ADMIN) shouldn't be able to perform. */
export function requireRole(ctx: WorkspaceContext, allowed: WorkspaceRole[]) {
  if (!allowed.includes(ctx.role)) {
    throw new Error("You don't have permission to do this.");
  }
}
