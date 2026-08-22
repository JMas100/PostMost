"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function InventoryFilters() {
  const router = useRouter();
  const pathname = usePathname() ?? "/inventory";
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const missingCostOnly = searchParams?.get("filter") === "missing-cost";
  const hasFilters = q || missingCostOnly;

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams?.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search item or SKU…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParams({ q });
        }}
        onBlur={() => updateParams({ q })}
        className="w-full sm:w-64"
      />
      <button
        type="button"
        onClick={() => updateParams({ filter: missingCostOnly ? "" : "missing-cost" })}
        className={cn(
          buttonVariants({ variant: missingCostOnly ? "default" : "outline", size: "sm" })
        )}
      >
        Missing cost
      </button>
      {hasFilters && (
        <Link
          href={pathname}
          onClick={() => setQ("")}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
