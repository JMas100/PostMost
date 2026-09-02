/** The subset of listing fields two very different call sites both need to build their own
 *  payload from: the job runner's ListingData (lib/marketplaces/types.ts, sent to a marketplace
 *  adapter) and the extension's ExtensionListingPayload (components/publish-panel/types.ts, sent
 *  to the browser extension via postMessage). Structurally compatible with both a Prisma
 *  `Listing` row and the plain object a client component receives as a prop -- no Prisma import
 *  here on purpose, since the extension side runs in the browser. Pulling just this shared
 *  11-field mapping into one place means adding or renaming a listing field only needs updating
 *  here, not independently in both payload builders. */
export interface ListingFieldsSource {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  sku: string | null;
}

export function listingDescriptionFields(listing: ListingFieldsSource) {
  return {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    quantity: listing.quantity,
    condition: listing.condition,
    category: listing.category,
    brand: listing.brand,
    size: listing.size,
    color: listing.color,
    material: listing.material,
    sku: listing.sku,
  };
}
