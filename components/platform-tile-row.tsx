import { PlatformLogo } from "@/components/platform-logo";

const TONE_BY_STATUS: Record<string, "default" | "failed" | "pending"> = {
  POSTED: "default",
  FAILED: "failed",
  PENDING: "pending",
  DELISTED: "pending",
  SOLD: "default",
};

/** The "Live on" column's logo-tile row -- failed-first so the one platform that needs a look
 *  isn't buried past the overflow cutoff, each tile tinted for its own status rather than a
 *  uniform white. Callers handle the draft ("Not published") and sold ("Delisted from N") text
 *  states themselves; this component only renders the tile row itself. */
export function PlatformTileRow({
  platformListings,
  max = 2,
}: {
  platformListings: { id: string; platform: string; status: string }[];
  max?: number;
}) {
  const sorted = [...platformListings].sort((a, b) => Number(b.status === "FAILED") - Number(a.status === "FAILED"));
  const visible = sorted.slice(0, max);
  const overflowCount = sorted.length - visible.length;

  if (sorted.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-nowrap items-center gap-1">
      {visible.map((pl) => (
        <PlatformLogo key={pl.id} platform={pl.platform} size={24} onDark tone={TONE_BY_STATUS[pl.status] ?? "default"} />
      ))}
      {overflowCount > 0 && (
        <span
          title={sorted
            .slice(max)
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
