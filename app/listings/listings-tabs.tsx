"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ListingsTab = "all" | "live" | "drafts" | "sold" | "attention";

const TABS: { value: ListingsTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "drafts", label: "Drafts" },
  { value: "sold", label: "Sold" },
  { value: "attention", label: "Needs attention" },
];

export function ListingsTabs({ counts }: { counts: Record<ListingsTab, number> }) {
  const pathname = usePathname() ?? "/listings";
  const searchParams = useSearchParams();
  const activeTab = (searchParams?.get("tab") as ListingsTab) || "all";

  function tabHref(tab: ListingsTab) {
    const params = new URLSearchParams(searchParams?.toString());
    if (tab === "all") params.delete("tab");
    else params.set("tab", tab);
    params.delete("page");
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
            {counts[tab.value] > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{counts[tab.value]}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
