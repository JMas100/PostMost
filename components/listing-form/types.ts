import { ListingFormData } from "@/lib/schemas/listing";

export const STEPS = ["photos", "details", "pricing", "review"] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_FIELDS: Record<StepId, (keyof ListingFormData)[]> = {
  photos: ["photos"],
  details: ["title", "description", "condition", "category"],
  pricing: ["price", "cost", "quantity"],
  review: [],
};

export const STEP_LABELS: Record<StepId, string> = {
  photos: "Photos",
  details: "Details",
  pricing: "Pricing",
  review: "Review",
};

export function isPhotoUrl(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("http") || trimmed.startsWith("data:");
}

export type OptimizingState = "" | "title" | "description" | "caption" | "price" | "photo";

export interface ShippingProfileOption {
  id: string;
  name: string;
}

export interface ListingFormProps {
  mode?: "create" | "draft";
  draftId?: string;
  initialData?: Partial<ListingFormData>;
  templates?: { id: string; name: string; payload: string }[];
  defaultTemplateId?: string;
  shippingProfiles?: ShippingProfileOption[];
}

export function computeInitialStep(data?: Partial<ListingFormData>): StepId {
  if (!data) return "photos";
  const hasPhotos = (data.photos?.length ?? 0) > 0;
  const hasDetails = !!data.title && !!data.description;
  const hasPricing = data.price != null && data.price > 0;
  if (!hasPhotos) return "photos";
  if (!hasDetails) return "details";
  if (!hasPricing) return "pricing";
  return "review";
}
