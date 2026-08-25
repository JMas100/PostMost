"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Marketplace accounts" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/shipping", label: "Shipping" },
  { href: "/settings/api", label: "API & integrations" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/billing", label: "Billing" },
];

export function SettingsNav() {
  const pathname = usePathname() ?? "/settings";

  return (
    <div className="flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = tab.href === "/settings" ? pathname === "/settings" : pathname.startsWith(tab.href);
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
