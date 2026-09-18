"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkSetCost } from "@/lib/actions/listings";
import { previewBulkCost, type CostRule } from "@/lib/inventory-bulk";

export interface BulkCostListing {
  id: string;
  title: string;
  cost: number | null;
}

const PREVIEW_ROW_LIMIT = 6;

export function BulkCostDialog({
  open,
  onOpenChange,
  listings,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: BulkCostListing[];
  onApplied: () => void;
}) {
  const [mode, setMode] = useState<CostRule["mode"]>("same");
  const [value, setValue] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const n = Number(value);
  const rule: CostRule | null = useMemo(
    () => (Number.isFinite(n) && n >= 0 ? { mode, value: n, overwriteExisting } : null),
    [mode, n, overwriteExisting]
  );

  const results = useMemo(() => (rule ? previewBulkCost(listings, rule) : []), [listings, rule]);
  const appliedCount = results.filter((r) => r.status === "applied").length;
  const alreadyCosted = listings.filter((l) => l.cost !== null);

  function reset() {
    setMode("same");
    setValue("");
    setOverwriteExisting(false);
  }

  function handleApply() {
    if (!rule || appliedCount === 0) return;
    startTransition(async () => {
      const result = await bulkSetCost(
        listings.map((l) => l.id),
        rule
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const parts = [`Set cost on ${result.appliedCount} item${result.appliedCount === 1 ? "" : "s"}`];
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} already had one`);
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
          <DialogTitle>Set cost on {listings.length} item{listings.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>For items you bought together at one price.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setMode("same")}
              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${mode === "same" ? "border-primary" : "hover:bg-muted"}`}
            >
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-4 ${mode === "same" ? "border-primary" : "border-muted-foreground/40"}`} />
              Same cost each
            </button>
            <button
              type="button"
              onClick={() => setMode("split")}
              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${mode === "split" ? "border-primary" : "hover:bg-muted"}`}
            >
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-4 ${mode === "split" ? "border-primary" : "border-muted-foreground/40"}`} />
              Split a lot price across them
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>{mode === "split" ? "Total lot price" : "Cost per item"}</Label>
            <div className="relative w-32">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="pl-5" placeholder="0.00" />
            </div>
          </div>

          {alreadyCosted.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                {alreadyCosted.length} item{alreadyCosted.length === 1 ? "" : "s"} already{" "}
                {alreadyCosted.length === 1 ? "has" : "have"} a cost.
              </span>{" "}
              {alreadyCosted[0].title} is set to ${alreadyCosted[0].cost!.toFixed(2)}
              {alreadyCosted.length > 1 ? `, and ${alreadyCosted.length - 1} more` : ""}. Overwrite it, or skip and apply to the
              rest.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={overwriteExisting} onCheckedChange={setOverwriteExisting} id="overwrite-cost" />
            <Label htmlFor="overwrite-cost" className="font-normal">
              Overwrite existing costs
            </Label>
          </div>

          {rule && (
            <div className="rounded-md border">
              <div className="max-h-64 divide-y overflow-y-auto">
                {results.slice(0, PREVIEW_ROW_LIMIT).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate">{r.title}</span>
                    {r.status === "applied" ? (
                      <span className="shrink-0 font-medium text-primary">${r.newCost!.toFixed(2)}</span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">skipped — has ${r.existingCost!.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
              {results.length > PREVIEW_ROW_LIMIT && (
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">and {results.length - PREVIEW_ROW_LIMIT} more</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || !rule || appliedCount === 0}>
            {isPending ? "Setting…" : `Set cost on ${appliedCount} item${appliedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
