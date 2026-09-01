"use server";

import { generateListingFromImage, GeneratedListing } from "@/lib/ai/generate-listing";
import { requireWorkspace } from "@/lib/auth-helpers";
import { canUseAI, incrementAIUsage } from "@/lib/actions/usage";

export async function generateListingFromPhoto(imageBase64: string): Promise<{
  success: boolean;
  listing?: GeneratedListing;
  error?: string;
}> {
  try {
    let userId: string;
    try {
      ({ workspaceUserId: userId } = await requireWorkspace());
    } catch {
      return { success: false, error: "You must be logged in to use AI generation." };
    }

    const usage = await canUseAI(userId);
    if (!usage.allowed) {
      return { success: false, error: usage.reason };
    }

    const listing = await generateListingFromImage(imageBase64);
    await incrementAIUsage(userId);

    return { success: true, listing };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze image";
    return { success: false, error: message };
  }
}
