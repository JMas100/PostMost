import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import { getTeam } from "@/lib/actions/team";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { TeamClient } from "./team-client";

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const ctx = await requireWorkspace();

  const owner = await prisma.user.findUnique({
    where: { id: ctx.workspaceUserId },
    select: { name: true, email: true },
  });
  const ownerName = owner?.name || owner?.email || "Account owner";
  const ownerInitial = (owner?.name || owner?.email || "?").charAt(0).toUpperCase();

  const team = await getTeam();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Team" />

      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {ownerInitial}
            </div>
            <div>
              <p className="font-medium">{ownerName}</p>
              {owner?.email && <p className="text-sm text-muted-foreground">{owner.email}</p>}
            </div>
          </div>
          <Badge variant="outline">Owner</Badge>
        </CardContent>
      </Card>

      <TeamClient team={team} viewerRole={ctx.role} viewerActingUserId={ctx.actingUserId} />
    </div>
  );
}
