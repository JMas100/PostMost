import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { isToday, isYesterday, format } from "date-fns";
import type { Notification } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import { Shell } from "@/components/sidebar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EMPTY_COPY } from "@/lib/notification-display";
import { NotificationsTabs, type NotificationsTab } from "./notifications-tabs";
import { NotificationsActions } from "./notifications-actions";
import { NotificationRow } from "./notification-row";

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export default async function NotificationsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId: userId } = await requireWorkspace();

  const tab = (["needs_you", "sales", "activity", "all"].includes(searchParams.tab ?? "")
    ? searchParams.tab
    : "needs_you") as NotificationsTab;

  const [items, needsYouCount, salesCount, activityCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, resolvedAt: null, ...(tab === "all" ? {} : { category: tab }) },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId, category: "needs_you", resolvedAt: null } }),
    prisma.notification.count({ where: { userId, category: "sales", resolvedAt: null } }),
    prisma.notification.count({ where: { userId, category: "activity", resolvedAt: null } }),
  ]);

  const counts: Record<NotificationsTab, number> = {
    needs_you: needsYouCount,
    sales: salesCount,
    activity: activityCount,
    all: needsYouCount + salesCount + activityCount,
  };

  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt);
    const group = groups[groups.length - 1]?.label === label ? groups[groups.length - 1] : undefined;
    if (group) group.items.push(n);
    else groups.push({ label, items: [n] });
  }

  const emptyCopy = tab === "all" ? EMPTY_COPY.needs_you : EMPTY_COPY[tab];

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Notifications"
          description="Everything the background jobs did, and everything that needs you."
          actions={<NotificationsActions />}
        />

        <NotificationsTabs counts={counts} />

        {items.length === 0 ? (
          <EmptyState variant="not-enough-data" headline={emptyCopy.title} body={emptyCopy.body} />
        ) : (
          <Card>
            <CardContent className="p-0">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="px-6 pt-5 pb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase sm:px-7">
                    {group.label}
                  </div>
                  {group.items.map((n) => (
                    <NotificationRow key={n.id} notification={n} />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
