"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

interface PlatformOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS: Record<string, string> = {
  all: "All statuses",
  live: "Live",
  drafts: "Drafts",
  sold: "Sold",
  attention: "Needs attention",
};

export function ListingsFilters({ platformOptions }: { platformOptions: PlatformOption[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/listings";
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams?.get("q") ?? "");

  const platform = searchParams?.get("platform") ?? "all";
  const status = searchParams?.get("tab") ?? "all";
  const sort = searchParams?.get("sort") === "price" ? "price" : "newest";
  const hasFilters = q || platform !== "all" || status !== "all" || sort !== "newest";

  const platformLabels: Record<string, string> = { all: "All platforms" };
  for (const p of platformOptions) platformLabels[p.id] = p.name;

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams?.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const activeCount = (q ? 1 : 0) + (platform !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  const searchInput = (
    <Input
      placeholder="Search listings…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") updateParams({ q });
      }}
      onBlur={() => updateParams({ q })}
      className="w-full sm:w-64"
    />
  );
  const statusSelect = (
    <Select value={status} onValueChange={(v) => updateParams({ tab: v ?? "all" })}>
      <SelectTrigger className="w-full sm:w-40">
        <SelectValue>{(v: string) => STATUS_OPTIONS[v] ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const platformSelect = (
    <Select value={platform} onValueChange={(v) => updateParams({ platform: v ?? "all" })}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue>{(v: string) => platformLabels[v] ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All platforms</SelectItem>
        {platformOptions.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const sortSelect = (
    <Select value={sort} onValueChange={(v) => updateParams({ sort: v === "price" ? "price" : "" })}>
      <SelectTrigger className="w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest first</SelectItem>
        <SelectItem value="price">Price: high to low</SelectItem>
      </SelectContent>
    </Select>
  );
  const clearLink = hasFilters && (
    <Link href={pathname} onClick={() => setQ("")} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
      Clear filters
    </Link>
  );

  return (
    <>
      {/* lg+: controls stay inline, as before. */}
      <div className="hidden items-center gap-2 lg:flex">
        {searchInput}
        {statusSelect}
        {platformSelect}
        {sortSelect}
        {clearLink}
      </div>

      {/* Below lg: one Filters button with an active-count badge, opening the same controls in
          a popover -- three separate controls don't fit this width. */}
      <div className="flex items-center gap-2 lg:hidden">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Filters
                {activeCount > 0 && (
                  <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent className="w-72 space-y-2 p-3">
            {searchInput}
            {statusSelect}
            {platformSelect}
            {sortSelect}
          </PopoverContent>
        </Popover>
        {clearLink}
      </div>
    </>
  );
}
