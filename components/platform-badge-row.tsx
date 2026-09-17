import { PlatformBadge } from "@/components/platform-badge";

/** Shared by every listing/inventory row that shows a platform set: failed-first so the one
 *  platform that needs a look isn't buried past the 3-badge cutoff, with a "+N" chip instead of
 *  silently dropping the rest. */
export function PlatformBadgeRow({
  platformListings,
}: {
  platformListings: { id: string; platform: string; status: string }[];
}) {
  const sorted = [...platformListings].sort((a, b) => Number(b.status === "FAILED") - Number(a.status === "FAILED"));
  const visible = sorted.slice(0, 3);
  const overflowCount = sorted.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((pl) => (
        <PlatformBadge key={pl.id} platform={pl.platform} status={pl.status} />
      ))}
      {overflowCount > 0 && (
        <span
          title={sorted
            .slice(3)
            .map((pl) => pl.platform)
            .join(", ")}
          className="inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium text-muted-foreground"
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}
