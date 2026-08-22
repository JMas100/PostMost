"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PlatformOption {
  id: string;
  name: string;
}

export function ListingsFilters({ platformOptions }: { platformOptions: PlatformOption[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/listings";
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams?.get("q") ?? "");

  const status = searchParams?.get("status") ?? "all";
  const platform = searchParams?.get("platform") ?? "all";
  const hasFilters = q || status !== "all" || platform !== "all";

  const statusLabels: Record<string, string> = { all: "All statuses", PUBLISHED: "Published", SOLD: "Sold" };
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

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <Select value={status} onValueChange={(v) => updateParams({ status: v ?? "all" })}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
          <SelectItem value="SOLD">Sold</SelectItem>
        </SelectContent>
      </Select>
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
