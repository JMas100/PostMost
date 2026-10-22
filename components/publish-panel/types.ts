export type PlatformMechanism = "automation" | "extension" | "unconnected";

export interface ResolvedPlatform {
  id: string;
  name: string;
  color: string;
  authType: "oauth" | "manual";
  mechanism: PlatformMechanism;
}

export interface PublishAccountSummary {
  platform: string;
}

export interface ExtensionListingPayload {
  id: string;
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
  shippingProfileId: string | null;
  weightLbs: number | null;
  /** Resolved from listing.shippingProfile?.whoPays -- "seller" | "buyer" | null. Extension-only
   *  (not part of ListingFieldsSource/ListingData, which the job-runner/API adapters also use and
   *  have no need for this): the extension has no DB access, so it needs the profile's whoPays
   *  handed to it directly rather than just the shippingProfileId, to answer Facebook's "Cover
   *  the shipping cost so buyers see free shipping" checkbox. */
  shippingWhoPays: string | null;
  photos: { id: string; url: string }[];
}

export interface PlatformListingSummary {
  platform: string;
  status: string;
  errorMessage: string | null;
  externalUrl?: string | null;
}

export interface PublishPanelProps {
  listingId: string;
  accounts: PublishAccountSummary[];
  extensionListing: ExtensionListingPayload;
  hasActiveJobs: boolean;
  platformListings: PlatformListingSummary[];
  /** Platform ids just published from the composer's Review step, if arriving straight from
   *  there -- seeds the confirmation dialog open on mount instead of requiring another click. */
  initialPublishedPlatforms?: string[];
}
