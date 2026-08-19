import { Badge } from "@/components/ui/badge";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { RotateCcw } from "lucide-react";

type PlatformListingStatus = "PENDING" | "POSTED" | "FAILED" | "DELISTED" | "SOLD";

const statusMap: Record<PlatformListingStatus, string> = {
  PENDING: "Pending",
  POSTED: "Posted",
  FAILED: "Failed",
  DELISTED: "Delisted",
  SOLD: "Sold",
};

const variantMap: Record<PlatformListingStatus, "outline" | "success" | "error"> = {
  PENDING: "outline",
  POSTED: "success",
  FAILED: "error",
  DELISTED: "outline",
  SOLD: "success",
};

export function PlatformBadge({
  platform,
  status,
  externalUrl,
  onRetry,
}: {
  platform: string;
  status: string;
  externalUrl?: string | null;
  onRetry?: () => void;
}) {
  const info = getPlatform(platform);
  const safeStatus = (statusMap[status as PlatformListingStatus] ? status : "PENDING") as PlatformListingStatus;
  const badge = (
    <Badge variant={variantMap[safeStatus]} className="gap-1">
      {info?.name || platform}
      <span className="opacity-70">{statusMap[safeStatus]}</span>
    </Badge>
  );
  const linked = externalUrl ? (
    <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
      {badge}
    </a>
  ) : (
    badge
  );

  if (!onRetry) return linked;

  return (
    <span className="inline-flex items-center gap-1">
      {linked}
      <button
        type="button"
        onClick={onRetry}
        aria-label={`Retry ${platform}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </span>
  );
}
