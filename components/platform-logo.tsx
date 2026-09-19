import { cn } from "@/lib/utils";
import { getPlatform } from "@/lib/marketplaces/platforms";

const LOGO_ASSET_IDS = new Set(["ebay", "etsy", "vinted", "shopify", "mercari", "depop", "whatnot"]);
// 4:1–5:1 wordmark SVGs — need an auto-width tile or they overflow a fixed square.
const WORDMARK_IDS = new Set(["mercari", "whatnot", "depop"]);
// Every authType !== "none" platform without a real logo asset needs an entry here -- without
// one, PlatformMark's text-name fallback gets truncated illegibly inside a small onDark tile
// (confirmed live: Facebook Marketplace/Craigslist/OfferUp rendered as "Fa"/blank/clipped text
// at a 22px tile before these were added).
const NO_ASSET_LETTER: Record<string, string> = { poshmark: "P", grailed: "G", facebook: "F", craigslist: "C", offerup: "O" };

export function PlatformMark({
  platformId,
  className,
  style,
}: {
  platformId: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const platform = getPlatform(platformId);
  const name = platform?.name ?? platformId;

  if (LOGO_ASSET_IDS.has(platformId)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/logos/${platformId}.svg`}
        alt={name}
        className={cn("h-4 w-16 object-contain", className)}
        style={style}
      />
    );
  }

  return (
    <span
      className={cn("block truncate text-center font-heading text-xs font-extrabold leading-none tracking-tight", className)}
      style={{ color: platform?.color, ...style }}
    >
      {name}
    </span>
  );
}

/**
 * Owns marketplace tile geometry: square for glyph marks, auto-width for
 * wordmarks (mercari/whatnot/depop overflow a fixed square by 7–19px), and a
 * letter tile for platforms with no asset (poshmark/grailed). Callers should
 * never hand-roll a tile wrapper around PlatformMark — that's the bug class
 * this component exists to close off.
 */
export function PlatformLogo({
  platform,
  size = 28,
  onDark = false,
  showLabel = onDark,
  tone = "default",
  className,
}: {
  platform: string;
  /** Tile edge in px: 22 dense · 26–28 rows · 30 mobile. */
  size?: number;
  /** Dark ground → always render a white tile + label (dark wordmarks vanish on obsidian). */
  onDark?: boolean;
  showLabel?: boolean;
  /** Per-listing platform status, not connection state: "failed" tints the tile red with a
   *  dimmed mark, "pending" mutes it dark, matching the Listings/Inventory row tiles. */
  tone?: "default" | "failed" | "pending";
  className?: string;
}) {
  const info = getPlatform(platform);
  const name = info?.name ?? platform;
  const letter = NO_ASSET_LETTER[platform];
  const isWordmark = WORDMARK_IDS.has(platform);
  const glyphHeight = isWordmark ? size * 0.32 : size * 0.4;

  // A lettermark tile is the platform's own brand color with white type -- a pure-black brand
  // (Grailed) is the one documented exception, since black-on-black-obsidian is invisible, and
  // inverts to a white tile with black type instead. Real logo-asset platforms always sit on
  // white regardless of tone, since the SVGs themselves are multi-color and need a plain backdrop.
  const isBlackBrand = info?.color?.toLowerCase() === "#000000";
  const letterTileBg = !info?.color || isBlackBrand ? "#fff" : info.color;
  const letterTextColor = !info?.color || isBlackBrand ? "#090B0D" : "#fff";

  const tile = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md px-1.5",
        tone === "failed" && "border border-destructive bg-destructive/10",
        tone === "pending" && "bg-[#24282D]",
        tone === "default" && !letter && "bg-white"
      )}
      style={{
        ...(isWordmark ? { height: size, minWidth: size, width: "auto" } : { height: size, width: size, paddingInline: 0 }),
        ...(tone === "default" && letter ? { backgroundColor: letterTileBg } : {}),
      }}
    >
      {letter ? (
        <span
          className={cn("font-heading font-bold", tone !== "default" && "opacity-50")}
          style={{ fontSize: size * 0.4, color: tone === "default" ? letterTextColor : "#090B0D" }}
        >
          {letter}
        </span>
      ) : (
        <PlatformMark
          platformId={platform}
          className={cn("h-auto w-auto overflow-visible whitespace-nowrap", tone !== "default" && "opacity-50")}
          style={{ height: glyphHeight }}
        />
      )}
    </span>
  );

  // On light grounds the mark (or, for Poshmark/Grailed, PlatformMark's own
  // colored text wordmark) can sit directly on the surface — no tile needed.
  // Letter tiles are a dark-ground-only affordance (the tile itself is white).
  if (!onDark) {
    return (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <PlatformMark platformId={platform} className="h-auto w-auto overflow-visible whitespace-nowrap" style={{ height: glyphHeight }} />
        {showLabel && <span className="text-sm">{name}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)} title={showLabel ? undefined : name}>
      {tile}
      {showLabel && <span className="text-sm">{name}</span>}
    </span>
  );
}
