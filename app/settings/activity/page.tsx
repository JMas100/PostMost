import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { authOptions } from "@/lib/auth";
import { getAuditLog } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const ACTION_ICONS: Record<string, string> = {
  "listing.created": "📦",
  "listing.deleted": "🗑️",
  "marketplace.connected": "🔗",
  "marketplace.reconnected": "🔗",
  "marketplace.disconnected": "⛓️‍💥",
  "team.invited": "✉️",
  "team.role_changed": "🔧",
  "team.member_removed": "👋",
  "team.member_joined": "🎉",
  "billing.plan_changed": "💳",
};

export default async function ActivitySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const entries = await getAuditLog();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Activity" description="Who did what in this workspace." />

      {entries.length === 0 ? (
        <EmptyState
          variant="first-run"
          headline="Nothing here yet"
          body="Connections, listings, and team changes will show up here as they happen."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 text-base leading-none" aria-hidden>
                  {ACTION_ICONS[entry.action] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorEmail} · {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
