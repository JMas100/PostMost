import { z } from "zod";

export const listingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  cost: z.coerce.number().min(0).optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  condition: z.string().min(1, "Select a condition"),
  category: z.string().min(1, "Select a category"),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  shippingProfileId: z.string().nullable().optional(),
  photos: z.array(
    z.string().refine(
      (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:image/"),
      { message: "Each photo must be a URL or uploaded image" }
    )
  ).min(1, "At least one photo is required"),
});

export type ListingFormData = z.infer<typeof listingSchema>;
