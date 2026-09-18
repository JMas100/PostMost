import { Check, TriangleAlert } from "lucide-react";
import { getPlatform } from "@/lib/marketplaces/platforms";
import type { ListingStatusInfo } from "@/lib/listing-status";

/**
 * The five-state pill from the handoff's Listings/Inventory tables. Tinted background + border
 * for every state except "failed", which stays a solid fill -- the one state meant to read as an
 * alarm at rest, per the handoff's own note that solid fill is reserved for the single most
 * urgent state.
 */
export function StatusPill({
  status,
  showPublishingCount = true,
}: {
  status: ListingStatusInfo;
  /** Listings shows "Publishing 2 of 4"; Inventory's narrower Status column just says "Publishing". */
  showPublishingCount?: boolean;
}) {
  switch (status.kind) {
    case "draft":
      return (
        <span className="inline-flex h-[22px] items-center rounded-md border border-input px-2 text-[11.5px] font-semibold text-muted-foreground">
          Draft
        </span>
      );
    case "sold": {
      const platformName = status.platform ? getPlatform(status.platform)?.name ?? status.platform : null;
      return (
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-success/15 px-2 text-[11.5px] font-semibold text-success">
          <Check className="h-2.5 w-2.5" />
          {platformName ? `Sold on ${platformName}` : "Sold"}
        </span>
      );
    }
    case "failed":
      return (
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-warning px-2 text-[11.5px] font-semibold text-warning-foreground">
          <TriangleAlert className="h-2.5 w-2.5" />
          {status.count} failed
        </span>
      );
    case "publishing":
      return (
        <span className="inline-flex h-[22px] items-center rounded-md border border-primary/35 bg-primary/10 px-2 text-[11.5px] font-semibold text-primary">
          {showPublishingCount ? `Publishing ${status.postedCount} of ${status.totalCount}` : "Publishing"}
        </span>
      );
    case "live":
      return (
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 text-[11.5px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Live on {status.count}
        </span>
      );
    case "none":
    default:
      return <span className="text-xs text-muted-foreground">—</span>;
  }
}
