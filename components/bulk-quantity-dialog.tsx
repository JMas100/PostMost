"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkAdjustQuantity } from "@/lib/actions/listings";
import { previewBulkQuantity, type QuantityRule } from "@/lib/inventory-bulk";

export interface BulkQuantityListing {
  id: string;
  title: string;
  quantity: number;
}

const PREVIEW_ROW_LIMIT = 6;

export function BulkQuantityDialog({
  open,
  onOpenChange,
  listings,
  stockSyncAvailable,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: BulkQuantityListing[];
  /** Whether the workspace's plan already includes stock sync -- the over-1-quantity warning
   *  below only means something for a seller who doesn't have it yet. */
  stockSyncAvailable: boolean;
  onApplied: () => void;
}) {
  const [mode, setMode] = useState<QuantityRule["mode"]>("add");
  const [value, setValue] = useState("1");
  const [isPending, startTransition] = useTransition();

  const n = Number(value);
  const rule: QuantityRule | null = useMemo(() => (Number.isFinite(n) ? { mode, value: n } : null), [mode, n]);

  const results = useMemo(() => (rule ? previewBulkQuantity(listings, rule) : []), [listings, rule]);
  const overOne = results.filter((r) => r.after > 1).length;

  function reset() {
    setMode("add");
    setValue("1");
  }

  function handleApply() {
    if (!rule) return;
    startTransition(async () => {
      const result = await bulkAdjustQuantity(
        listings.map((l) => l.id),
        rule
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const parts = [`Adjusted ${result.results.length} item${result.results.length === 1 ? "" : "s"}`];
      if (result.overStockSyncLimitCount > 0) {
        parts.push(
          `${result.overStockSyncLimitCount} above 1 need stock sync (Pro) to stay in step across marketplaces`
        );
      }
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust quantity on {listings.length} item{listings.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>After a restock, or a stocktake.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as QuantityRule["mode"])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="subtract">Subtract</SelectItem>
                <SelectItem value="set">Set to</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-20" />
            <span className="text-sm text-muted-foreground">{mode === "set" ? "for each" : "to each"}</span>
          </div>

          {rule && (
            <div className="rounded-md border">
              <div className="max-h-64 divide-y overflow-y-auto">
                {results.slice(0, PREVIEW_ROW_LIMIT).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate text-muted-foreground">{r.title}</span>
                    <span className="shrink-0 font-medium">
                      {r.before} <span className="text-muted-foreground">→</span> {r.after}
                    </span>
                  </div>
                ))}
              </div>
              {results.length > PREVIEW_ROW_LIMIT && (
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">and {results.length - PREVIEW_ROW_LIMIT} more</div>
              )}
            </div>
          )}

          {overOne > 0 && !stockSyncAvailable && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              Quantities above one need <span className="font-medium text-foreground">stock sync</span> to keep marketplaces in
              step — it&apos;s a Pro rule, and {overOne} of these item{overOne === 1 ? "" : "s"}{" "}
              {overOne === 1 ? "isn't" : "aren't"} covered by your plan.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || !rule}>
            {isPending ? "Adjusting…" : `Adjust ${listings.length} item${listings.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
