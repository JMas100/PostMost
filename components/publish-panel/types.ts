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
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  sku: string | null;
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
