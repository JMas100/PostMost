import { cn } from "@/lib/utils";
import { getPlatform } from "@/lib/marketplaces/platforms";

const LOGO_ASSET_IDS = new Set(["ebay", "etsy", "vinted", "shopify", "mercari", "depop", "whatnot"]);
// 4:1–5:1 wordmark SVGs — need an auto-width tile or they overflow a fixed square.
const WORDMARK_IDS = new Set(["mercari", "whatnot", "depop"]);
const NO_ASSET_LETTER: Record<string, string> = { poshmark: "P", grailed: "G" };

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
  className,
}: {
  platform: string;
  /** Tile edge in px: 22 dense · 26–28 rows · 30 mobile. */
  size?: number;
  /** Dark ground → always render a white tile + label (dark wordmarks vanish on obsidian). */
  onDark?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const info = getPlatform(platform);
  const name = info?.name ?? platform;
  const letter = NO_ASSET_LETTER[platform];
  const isWordmark = WORDMARK_IDS.has(platform);
  const glyphHeight = isWordmark ? size * 0.32 : size * 0.4;

  const tile = (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-white px-1.5"
      style={isWordmark ? { height: size, minWidth: size, width: "auto" } : { height: size, width: size, paddingInline: 0 }}
    >
      {letter ? (
        <span className="font-heading font-bold text-[#090B0D]" style={{ fontSize: size * 0.4 }}>
          {letter}
        </span>
      ) : (
        <PlatformMark platformId={platform} className="h-auto w-auto overflow-visible whitespace-nowrap" style={{ height: glyphHeight }} />
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
