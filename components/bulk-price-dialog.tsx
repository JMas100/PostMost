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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkUpdatePrice } from "@/lib/actions/listings";
import { previewBulkPrice, type PriceChange } from "@/lib/pricing";

export interface BulkPriceListing {
  id: string;
  title: string;
  price: number;
  cost: number | null;
  hasLivePlatform: boolean;
}

const PREVIEW_ROW_LIMIT = 6;

export function BulkPriceDialog({
  open,
  onOpenChange,
  listings,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: BulkPriceListing[];
  onApplied: () => void;
}) {
  const [changeType, setChangeType] = useState<PriceChange["type"]>("percentage");
  const [amountValue, setAmountValue] = useState("10");
  const [useFloor, setUseFloor] = useState(true);
  const [floorPercent, setFloorPercent] = useState("20");
  const [pushToMarketplaces, setPushToMarketplaces] = useState(true);
  const [isPending, startTransition] = useTransition();

  const anyLive = listings.some((l) => l.hasLivePlatform);

  const change: PriceChange | null = useMemo(() => {
    const n = Number(amountValue);
    if (!Number.isFinite(n)) return null;
    if (changeType === "percentage") return { type: "percentage", percent: n };
    if (changeType === "amount") return { type: "amount", amount: n };
    return { type: "set", value: n };
  }, [changeType, amountValue]);

  const floorMarginPercent = useFloor && Number.isFinite(Number(floorPercent)) ? Number(floorPercent) : undefined;

  const results = useMemo(() => {
    if (!change) return [];
    return listings.map((l) => previewBulkPrice(l, { change, floorMarginPercent }));
  }, [listings, change, floorMarginPercent]);

  const appliedCount = results.filter((r) => r.status === "applied").length;
  const skippedCount = results.length - appliedCount;

  function reset() {
    setChangeType("percentage");
    setAmountValue("10");
    setUseFloor(true);
    setFloorPercent("20");
    setPushToMarketplaces(true);
  }

  function handleApply() {
    if (!change || appliedCount === 0) return;
    startTransition(async () => {
      const result = await bulkUpdatePrice(
        listings.map((l) => l.id),
        { change, floorMarginPercent },
        { pushToMarketplaces: anyLive && pushToMarketplaces }
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const parts = [`Updated ${result.appliedCount} listing${result.appliedCount === 1 ? "" : "s"}`];
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} skipped (would breach the floor)`);
      if (result.queuedRepriceJobs > 0) parts.push(`pushing to ${result.queuedRepriceJobs} live marketplace listing${result.queuedRepriceJobs === 1 ? "" : "s"}`);
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
          <DialogTitle>Edit price on {listings.length} listing{listings.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Nothing changes until you apply. The preview updates as you type.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1.5">
              <Label>What should happen</Label>
              <Select value={changeType} onValueChange={(v) => setChangeType(v as PriceChange["type"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Reduce by a percentage</SelectItem>
                  <SelectItem value="amount">Reduce by an amount</SelectItem>
                  <SelectItem value="set">Set every price to the same value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>&nbsp;</Label>
              <div className="relative">
                {changeType !== "percentage" && (
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                )}
                <Input
                  type="number"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  className={changeType !== "percentage" ? "w-28 pl-5" : "w-20"}
                />
                {changeType === "percentage" && (
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <Switch checked={useFloor} onCheckedChange={setUseFloor} id="use-floor" />
              <Label htmlFor="use-floor" className="font-normal">
                Never go below cost +
              </Label>
              <Input
                type="number"
                value={floorPercent}
                onChange={(e) => setFloorPercent(e.target.value)}
                disabled={!useFloor}
                className="h-8 w-16"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {anyLive && (
            <div className="flex items-center gap-2">
              <Switch checked={pushToMarketplaces} onCheckedChange={setPushToMarketplaces} id="push-marketplaces" />
              <Label htmlFor="push-marketplaces" className="font-normal">
                Also update the price on every live marketplace this applies to
              </Label>
            </div>
          )}

          <div className="rounded-md border">
            <div className="max-h-64 overflow-y-auto divide-y">
              {results.slice(0, PREVIEW_ROW_LIMIT).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate">{r.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.status === "applied" ? (
                      <>
                        <span className="text-muted-foreground line-through">${r.oldPrice.toFixed(2)}</span>
                        <span className="font-medium text-primary">${r.newPrice.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-warning" title={r.reason}>
                        ${r.oldPrice.toFixed(2)} — {r.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {results.length > PREVIEW_ROW_LIMIT && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                and {results.length - PREVIEW_ROW_LIMIT} more
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {appliedCount} of {results.length} listing{results.length === 1 ? "" : "s"} will change
            {skippedCount > 0 && ` — ${skippedCount} skipped (would breach the floor)`}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || !change || appliedCount === 0}>
            {isPending ? "Applying…" : `Apply to ${appliedCount} listing${appliedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
