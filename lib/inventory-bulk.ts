/** Pure bulk-inventory math shared between the server actions (lib/actions/listings.ts) and
 *  Inventory's bulk-action dialogs' live preview -- same split as lib/pricing.ts and for the same
 *  reason: the preview has to update on every keystroke with no server round-trip, and the real
 *  mutation must never be able to disagree with what the preview just showed. Plain module, no
 *  "use server", so a client component can import these directly. */

export interface CostRule {
  mode: "same" | "split";
  /** Cost per item ("same" mode) or total lot price to divide across applied items ("split" mode). */
  value: number;
  overwriteExisting: boolean;
}

export interface CostPreviewRow {
  id: string;
  title: string;
  status: "applied" | "skipped";
  newCost?: number;
  existingCost?: number;
}

/** "same" divides evenly across whatever will actually be applied, not the original selection --
 *  if 1 of 3 already has a cost and is skipped, splitting a lot price across the remaining 2 is
 *  the number that's actually true of what's being set. */
export function previewBulkCost(
  listings: { id: string; title: string; cost: number | null }[],
  rule: CostRule
): CostPreviewRow[] {
  const applying = rule.overwriteExisting ? listings : listings.filter((l) => l.cost === null);
  const perItem = rule.mode === "split" && applying.length > 0 ? rule.value / applying.length : rule.value;

  return listings.map((l) => {
    const willApply = rule.overwriteExisting || l.cost === null;
    if (!willApply) {
      return { id: l.id, title: l.title, status: "skipped", existingCost: l.cost ?? undefined };
    }
    return { id: l.id, title: l.title, status: "applied", newCost: Math.round(perItem * 100) / 100 };
  });
}

export interface QuantityRule {
  mode: "add" | "subtract" | "set";
  value: number;
}

export interface QuantityPreviewRow {
  id: string;
  title: string;
  before: number;
  after: number;
}

export function previewBulkQuantity(
  listings: { id: string; title: string; quantity: number }[],
  rule: QuantityRule
): QuantityPreviewRow[] {
  return listings.map((l) => {
    const after =
      rule.mode === "set" ? rule.value : rule.mode === "subtract" ? l.quantity - rule.value : l.quantity + rule.value;
    return { id: l.id, title: l.title, before: l.quantity, after: Math.max(0, Math.round(after)) };
  });
}

export interface SkuPreviewRow {
  id: string;
  title: string;
  status: "applied" | "skipped";
  newSku?: string;
  existingSku?: string;
}

/** {BRAND} and {CATEGORY} fall back to "ITEM" when blank rather than leaving a literal "{BRAND}-"
 *  in a SKU someone will write on a physical box. {n} is a per-listing sequence number, 1-based,
 *  counted only across the listings that actually need one (existing SKUs are never touched, so
 *  they don't consume a number). */
export function previewBulkSkus(
  listings: { id: string; title: string; sku: string | null; brand: string | null; category: string | null }[],
  pattern: string
): SkuPreviewRow[] {
  let n = 0;
  return listings.map((l) => {
    if (l.sku) {
      return { id: l.id, title: l.title, status: "skipped", existingSku: l.sku };
    }
    n += 1;
    const brandToken = (l.brand || "ITEM").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ITEM";
    const categoryToken = (l.category || "GEN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "GEN";
    const newSku = pattern
      .replace(/\{BRAND\}/g, brandToken)
      .replace(/\{CATEGORY\}/g, categoryToken)
      .replace(/\{n\}/g, String(n).padStart(3, "0"));
    return { id: l.id, title: l.title, status: "applied", newSku };
  });
}
