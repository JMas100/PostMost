import { Badge } from "@/components/ui/badge";
import { getPlatform } from "@/lib/marketplaces/platforms";

type PlatformListingStatus = "PENDING" | "POSTED" | "FAILED" | "DELISTED" | "SOLD";

const statusMap: Record<PlatformListingStatus, string> = {
  PENDING: "Pending",
  POSTED: "Posted",
  FAILED: "Failed",
  DELISTED: "Delisted",
  SOLD: "Sold",
};

const variantMap: Record<PlatformListingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  POSTED: "default",
  FAILED: "destructive",
  DELISTED: "outline",
  SOLD: "default",
};

export function PlatformBadge({ platform, status, externalUrl }: { platform: string; status: string; externalUrl?: string | null }) {
  const info = getPlatform(platform);
  const safeStatus = (statusMap[status as PlatformListingStatus] ? status : "PENDING") as PlatformListingStatus;
  const badge = (
    <Badge variant={variantMap[safeStatus]} className="gap-1">
      {info?.name || platform}
      <span className="opacity-70">{statusMap[safeStatus]}</span>
    </Badge>
  );
  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
        {badge}
      </a>
    );
  }
  return badge;
}
