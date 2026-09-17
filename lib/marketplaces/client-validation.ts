import type { ListingData } from "./types";
import { checkPoshmarkListing } from "./adapters/poshmark-validation";

/** Client-safe (no Playwright, no server-only imports) pre-flight checks, keyed by platform id --
 *  lets the listing wizard's platform picker warn about a platform-specific requirement (e.g.
 *  Poshmark needing a Women/Men/Kids/Home/Pets/Electronics category) live, as the user fills out
 *  the form, instead of only after they click Publish. Mirrors MarketplaceAdapter.validateListing
 *  (lib/marketplaces/types.ts), which stays the authoritative server-side check -- this is purely
 *  an earlier, friendlier warning, not a replacement for it. Add an entry here only for a platform
 *  whose check has no server-only dependencies; most won't need one at all. */
type ListingCheckInput = Pick<ListingData, "category" | "audience" | "title" | "description">;

const CLIENT_VALIDATORS: Record<string, (listing: ListingCheckInput) => { valid: true } | { valid: false; error: string }> = {
  poshmark: checkPoshmarkListing,
};

export function getPlatformListingWarning(platformId: string, listing: ListingCheckInput): string | undefined {
  const check = CLIENT_VALIDATORS[platformId]?.(listing);
  return check && !check.valid ? check.error : undefined;
}
