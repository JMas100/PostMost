import { cn } from "@/lib/utils";
import { getPlatform } from "@/lib/marketplaces/platforms";

const LOGO_ASSET_IDS = new Set(["ebay", "etsy", "vinted", "shopify", "mercari", "depop", "whatnot"]);

export function PlatformMark({ platformId, className }: { platformId: string; className?: string }) {
  const platform = getPlatform(platformId);
  const name = platform?.name ?? platformId;

  if (LOGO_ASSET_IDS.has(platformId)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/logos/${platformId}.svg`}
        alt={name}
        className={cn("h-4 w-16 object-contain", className)}
      />
    );
  }

  return (
    <span
      className={cn("font-heading text-xs font-extrabold leading-none tracking-tight", className)}
      style={{ color: platform?.color }}
    >
      {name}
    </span>
  );
}

export function PlatformLogo({ platformId, className }: { platformId: string; className?: string }) {
  const platform = getPlatform(platformId);
  return (
    <span
      title={platform?.name ?? platformId}
      className={cn(
        "inline-flex h-8 w-20 items-center justify-center rounded-lg border border-border bg-card px-2 shadow-sm",
        className
      )}
    >
      <PlatformMark platformId={platformId} className="h-4 w-full" />
    </span>
  );
}
