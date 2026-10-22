/** The subset of listing fields two very different call sites both need to build their own
 *  payload from: the job runner's ListingData (lib/marketplaces/types.ts, sent to a marketplace
 *  adapter) and the extension's ExtensionListingPayload (components/publish-panel/types.ts, sent
 *  to the browser extension via postMessage). Structurally compatible with both a Prisma
 *  `Listing` row and the plain object a client component receives as a prop -- no Prisma import
 *  here on purpose, since the extension side runs in the browser. Pulling just this shared
 *  field mapping into one place means adding or renaming a listing field only needs updating
 *  here, not independently in both payload builders. */
export interface ListingFieldsSource {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string;
  categoryDetail: string | null;
  categoryPath: string[];
  audience: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  sku: string | null;
  /** Null when the seller picked "None" on the Pricing step's Shipping profile Select --
   *  doubles as the "does this item ship" signal for marketplace posting, not just the
   *  profit-margin estimate it originally existed for. See the ShippingProfile model. */
  shippingProfileId: string | null;
  /** The item's real weight -- required whenever shippingProfileId is set (see the superRefine
   *  in lib/schemas/listing.ts). Distinct from ShippingProfile.maxWeightLbs, a reusable policy's
   *  eligibility ceiling, not any one item's actual weight. See the Listing model's own comment. */
  weightLbs: number | null;
}

export function listingDescriptionFields(listing: ListingFieldsSource) {
  return {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    quantity: listing.quantity,
    condition: listing.condition,
    category: listing.category,
    categoryDetail: listing.categoryDetail,
    categoryPath: listing.categoryPath,
    audience: listing.audience,
    brand: listing.brand,
    size: listing.size,
    color: listing.color,
    material: listing.material,
    sku: listing.sku,
    shippingProfileId: listing.shippingProfileId,
    weightLbs: listing.weightLbs,
  };
}
