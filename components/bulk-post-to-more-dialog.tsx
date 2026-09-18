"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlatformLogo } from "@/components/platform-logo";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { bulkPostToMore } from "@/lib/actions/crosspost";

export interface PostToMoreListing {
  id: string;
  title: string;
  platformListings: { platform: string; status: string }[];
}

export function BulkPostToMoreDialog({
  open,
  onOpenChange,
  listings,
  connectedPlatforms,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: PostToMoreListing[];
  /** Every platform the workspace has an active account on -- not just the ones already used by
   *  this selection, since "post to more" means offering somewhere new. */
  connectedPlatforms: string[];
  onApplied: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // How many of the selected listings are missing each connected platform -- computed from data
  // already loaded in the table, no server round-trip needed just to populate this list.
  const missingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const platform of connectedPlatforms) {
      const missing = listings.filter((l) => !l.platformListings.some((pl) => pl.platform === platform)).length;
      if (missing > 0) counts.set(platform, missing);
    }
    return counts;
  }, [listings, connectedPlatforms]);

  const offerable = connectedPlatforms.filter((p) => missingCounts.has(p));
  const targetCount = Array.from(selected).reduce((sum, p) => sum + (missingCounts.get(p) ?? 0), 0);

  function toggle(platform: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
  }

  function handleApply() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const result = await bulkPostToMore(
        listings.map((l) => l.id),
        Array.from(selected)
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const parts = [`Queued ${result.queuedCount} platform${result.queuedCount === 1 ? "" : "s"} — check back in a minute`];
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} skipped`);
      toast.success(parts.join(" — "));
      onOpenChange(false);
      reset();
      onApplied();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post {listings.length} listing{listings.length === 1 ? "" : "s"} to more marketplaces</DialogTitle>
          <DialogDescription>Only offers a marketplace where at least one selected listing isn&apos;t live yet.</DialogDescription>
        </DialogHeader>

        {offerable.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Every selected listing is already live or pending on every marketplace you&apos;re connected to.
          </p>
        ) : (
          <div className="space-y-1">
            {offerable.map((platform) => {
              const missing = missingCounts.get(platform) ?? 0;
              return (
                <label
                  key={platform}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-2.5 hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox checked={selected.has(platform)} onCheckedChange={() => toggle(platform)} />
                    <PlatformLogo platform={platform} size={22} />
                    <span className="text-sm font-medium">{getPlatform(platform)?.name ?? platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {missing} of {listings.length} missing
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || selected.size === 0}>
            {isPending ? "Queuing…" : `Post ${targetCount || ""} to ${selected.size} marketplace${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
