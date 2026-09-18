/** One status model shared by Listings and Inventory's tables -- both draw the same five states
 *  from the same platformListings data, just with slightly different copy (Inventory's
 *  "Publishing" carries no count, Listings' does). Priority order matters: a draft is always a
 *  draft regardless of stale platformListings rows, a sale is definitive, then failures need
 *  attention before an in-flight publish, which itself outranks a clean "live" read. */

export type ListingStatusInfo =
  | { kind: "draft" }
  | { kind: "sold"; platform?: string }
  | { kind: "failed"; count: number }
  | { kind: "publishing"; postedCount: number; totalCount: number }
  | { kind: "live"; count: number }
  | { kind: "none" };

export function computeListingStatus(listing: {
  isDraft: boolean;
  status: string;
  platformListings: { platform: string; status: string }[];
}): ListingStatusInfo {
  if (listing.isDraft) return { kind: "draft" };

  if (listing.status === "SOLD") {
    const soldPlatform = listing.platformListings.find((p) => p.status === "SOLD")?.platform;
    return { kind: "sold", platform: soldPlatform };
  }

  const failedCount = listing.platformListings.filter((p) => p.status === "FAILED").length;
  if (failedCount > 0) return { kind: "failed", count: failedCount };

  const pendingCount = listing.platformListings.filter((p) => p.status === "PENDING").length;
  const postedCount = listing.platformListings.filter((p) => p.status === "POSTED").length;
  if (pendingCount > 0) return { kind: "publishing", postedCount, totalCount: listing.platformListings.length };

  if (postedCount > 0) return { kind: "live", count: postedCount };
  return { kind: "none" };
}
