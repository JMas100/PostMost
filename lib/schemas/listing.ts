import { z } from "zod";

// Exported separately from listingSchema below (not just inlined) because a handful of call
// sites need .partial() -- drafts and templates, which are allowed to be incomplete on purpose --
// and .partial() isn't available on the .superRefine()-wrapped schema.
export const listingObjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  cost: z.coerce.number().min(0).optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  condition: z.string().min(1, "Select a condition"),
  category: z.string().min(1, "Select a category"),
  categoryDetail: z.string().nullable().optional(),
  categoryPath: z.array(z.string()).default([]),
  audience: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  shippingProfileId: z.string().nullable().optional(),
  // The item's real weight -- required below whenever shippingProfileId is set, since
  // marketplace shipping forms (e.g. Facebook's "Package weight" bracket picker) ask for it
  // directly. See the Listing model's own field comment for why this isn't
  // ShippingProfile.maxWeightLbs.
  weightLbs: z.coerce.number().positive().nullable().optional(),
  photos: z.array(
    z.string().refine(
      (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:image/"),
      { message: "Each photo must be a URL or uploaded image" }
    )
  ).min(1, "At least one photo is required"),
});

export const listingSchema = listingObjectSchema.superRefine((data, ctx) => {
  if (data.shippingProfileId && !(typeof data.weightLbs === "number" && data.weightLbs > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter the item's weight to offer shipping",
      path: ["weightLbs"],
    });
  }
});

export type ListingFormData = z.infer<typeof listingObjectSchema>;
