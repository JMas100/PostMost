import { prisma } from "@/lib/prisma";
import { requireWorkspace, type WorkspaceContext } from "@/lib/auth-helpers";

/** Records a workspace-mutating action for the accountability trail. Never blocks or throws
 *  the caller's own operation on failure -- a missed audit entry is a lesser problem than
 *  failing a real delete/invite/connect because logging it hit an error. */
export async function logAudit(
  ctx: Pick<WorkspaceContext, "workspaceUserId" | "actingUserId">,
  params: { action: string; targetType?: string; targetId?: string; message: string }
) {
  try {
    const actor = await prisma.user.findUnique({ where: { id: ctx.actingUserId }, select: { email: true } });
    await prisma.auditLogEntry.create({
      data: {
        workspaceUserId: ctx.workspaceUserId,
        actorUserId: ctx.actingUserId,
        actorEmail: actor?.email ?? "unknown",
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        message: params.message,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err);
  }
}

/** Readable by every active workspace member, not just OWNER/ADMIN -- unlike billing, "who did
 *  what" isn't sensitive within a team that already shares the underlying data, and full
 *  visibility is more in keeping with a shared workspace than restricting it. */
export async function getAuditLog(limit = 100) {
  const { workspaceUserId } = await requireWorkspace();
  return prisma.auditLogEntry.findMany({
    where: { workspaceUserId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
