/** Pure price-rule math shared between the bulk-price server action (lib/actions/listings.ts)
 *  and the Bulk Edit dialog's live preview (which needs to compute a rule's effect on every
 *  keystroke without a server round-trip -- "the table previews as you type, nothing changes
 *  until you apply"). Kept in its own plain module (no "use server") since a "use server" file's
 *  exports all become server-action RPC references, not plain callable functions a client
 *  component could import directly. */

export type PriceChange =
  | { type: "percentage"; percent: number }
  | { type: "amount"; amount: number }
  | { type: "set"; value: number };

export interface BulkPriceRule {
  change: PriceChange;
  /** Skip any row whose computed new price would fall below cost * (1 + floorMarginPercent / 100).
   *  A row with no cost on file is also skipped when this is set, since the floor can't be
   *  checked without one -- "skip, don't block": the rest of the batch still applies. */
  floorMarginPercent?: number;
}

export interface BulkPriceResult {
  id: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  status: "applied" | "skipped";
  reason?: string;
}

export function computeNewPrice(oldPrice: number, change: PriceChange): number {
  switch (change.type) {
    case "percentage":
      return Math.max(0, oldPrice * (1 - change.percent / 100));
    case "amount":
      return Math.max(0, oldPrice - change.amount);
    case "set":
      return Math.max(0, change.value);
  }
}

/** Applies a rule to one listing's price/cost, returning the same shape bulkUpdatePrice returns
 *  per row -- used for both the real mutation and the client-side dry-run preview so the two
 *  can never disagree about what a rule does. */
export function previewBulkPrice(
  listing: { id: string; title: string; price: number; cost: number | null },
  rule: BulkPriceRule
): BulkPriceResult {
  const newPrice = Math.round(computeNewPrice(listing.price, rule.change) * 100) / 100;

  if (rule.floorMarginPercent != null) {
    if (listing.cost == null) {
      return {
        id: listing.id,
        title: listing.title,
        oldPrice: listing.price,
        newPrice,
        status: "skipped",
        reason: "No cost on file to check the price floor against",
      };
    }
    const floor = listing.cost * (1 + rule.floorMarginPercent / 100);
    if (newPrice < floor) {
      return {
        id: listing.id,
        title: listing.title,
        oldPrice: listing.price,
        newPrice,
        status: "skipped",
        reason: `Would fall below cost + ${rule.floorMarginPercent}%`,
      };
    }
  }

  return { id: listing.id, title: listing.title, oldPrice: listing.price, newPrice, status: "applied" };
}
