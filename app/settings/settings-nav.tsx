"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/shipping", label: "Shipping" },
  { href: "/settings/api", label: "API & integrations" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/billing", label: "Billing" },
];

// Marketplace connections live on their own page now, not a settings sub-page -- this stays in
// the tab row (so both mental models find it) but leaves the settings route tree entirely.
const MARKETPLACES_TAB = { href: "/marketplaces", label: "Marketplaces" };

export function SettingsNav() {
  const pathname = usePathname() ?? "/settings";

  return (
    <div className="flex flex-wrap gap-1 border-b">
      <Link
        href={MARKETPLACES_TAB.href}
        className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {MARKETPLACES_TAB.label}
      </Link>
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
