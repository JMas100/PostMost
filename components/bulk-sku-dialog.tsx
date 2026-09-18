"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkGenerateSkus } from "@/lib/actions/listings";
import { previewBulkSkus } from "@/lib/inventory-bulk";

export interface BulkSkuListing {
  id: string;
  title: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
}

const PREVIEW_ROW_LIMIT = 6;
const DEFAULT_PATTERN = "{BRAND}-{CATEGORY}-{n}";

export function BulkSkuDialog({
  open,
  onOpenChange,
  listings,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: BulkSkuListing[];
  onApplied: () => void;
}) {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [isPending, startTransition] = useTransition();

  const results = useMemo(() => previewBulkSkus(listings, pattern || DEFAULT_PATTERN), [listings, pattern]);
  const appliedCount = results.filter((r) => r.status === "applied").length;

  function reset() {
    setPattern(DEFAULT_PATTERN);
  }

  function handleApply() {
    if (appliedCount === 0) return;
    startTransition(async () => {
      const result = await bulkGenerateSkus(
        listings.map((l) => l.id),
        pattern || DEFAULT_PATTERN
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Generated ${result.appliedCount} SKU${result.appliedCount === 1 ? "" : "s"}`);
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
          <DialogTitle>Generate SKUs</DialogTitle>
          <DialogDescription>
            For the {appliedCount} selected item{appliedCount === 1 ? "" : "s"} with no SKU.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pattern</Label>
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono text-sm" />
          </div>

          <div className="rounded-md border">
            <div className="max-h-64 divide-y overflow-y-auto">
              {results.slice(0, PREVIEW_ROW_LIMIT).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className={`truncate ${r.status === "skipped" ? "text-muted-foreground opacity-60" : "text-muted-foreground"}`}>
                    {r.title}
                  </span>
                  {r.status === "applied" ? (
                    <span className="shrink-0 font-mono text-xs font-medium text-primary">{r.newSku}</span>
                  ) : (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground opacity-60">has {r.existingSku}</span>
                  )}
                </div>
              ))}
            </div>
            {results.length > PREVIEW_ROW_LIMIT && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">and {results.length - PREVIEW_ROW_LIMIT} more</div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Existing SKUs are never replaced — it&apos;s how a seller finds an item in a physical bin, so overwriting one silently
            strands the box it&apos;s written on.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || appliedCount === 0}>
            {isPending ? "Generating…" : `Generate ${appliedCount} SKU${appliedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
