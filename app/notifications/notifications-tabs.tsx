"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type NotificationsTab = "needs_you" | "sales" | "activity" | "all";

const TABS: { value: NotificationsTab; label: string }[] = [
  { value: "needs_you", label: "Needs you" },
  { value: "sales", label: "Sales" },
  { value: "activity", label: "Activity" },
  { value: "all", label: "All" },
];

export function NotificationsTabs({ counts }: { counts: Record<NotificationsTab, number> }) {
  const pathname = usePathname() ?? "/notifications";
  const searchParams = useSearchParams();
  const activeTab = (searchParams?.get("tab") as NotificationsTab) || "needs_you";

  function tabHref(tab: NotificationsTab) {
    const params = new URLSearchParams(searchParams?.toString());
    if (tab === "needs_you") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {counts[tab.value] > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{counts[tab.value]}</span>}
          </Link>
        );
      })}
    </div>
  );
}
