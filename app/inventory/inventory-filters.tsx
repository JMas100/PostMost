"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function InventoryFilters() {
  const router = useRouter();
  const pathname = usePathname() ?? "/inventory";
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const missingCostOnly = searchParams?.get("filter") === "missing-cost";
  const sort = searchParams?.get("sort") === "value" ? "value" : "newest";
  const hasFilters = q || missingCostOnly || sort !== "newest";

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
          buttonVariants({ variant: missingCostOnly ? "default" : "outline", size: "sm" }),
          missingCostOnly && "border-warning bg-transparent text-foreground hover:bg-transparent"
        )}
      >
        Missing cost
      </button>
      <Select value={sort} onValueChange={(v) => updateParams({ sort: v === "value" ? "value" : "" })}>
        <SelectTrigger className="h-7 w-40 text-[0.8rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="value">Highest value</SelectItem>
        </SelectContent>
      </Select>
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
