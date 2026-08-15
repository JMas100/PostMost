"use server";

import { generateListingFromImage, GeneratedListing } from "@/lib/ai/generate-listing";

export async function generateListingFromPhoto(imageBase64: string): Promise<{
  success: boolean;
  listing?: GeneratedListing;
  error?: string;
}> {
  try {
    const listing = await generateListingFromImage(imageBase64);
    return { success: true, listing };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze image";
    return { success: false, error: message };
  }
}
