"use server";

import { generateListingFromImage, GeneratedListing } from "@/lib/ai/generate-listing";
import { requireWorkspace } from "@/lib/auth-helpers";
import { canUseAI, incrementAIUsage } from "@/lib/actions/usage";
import { checkRateLimit } from "@/lib/rate-limit";

// Separate from the monthly plan quota (canUseAI/incrementAIUsage below) -- that caps total
// spend, this caps how fast it can be spent, so a script hammering this action can't burn a
// whole month's OpenAI budget in seconds before the quota check even has a chance to matter
// for the *next* billing cycle's experience.
const AI_GENERATE_WINDOW_MS = 10 * 60 * 1000;
const AI_GENERATE_MAX_PER_WINDOW = 20;

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

    const rateCheck = await checkRateLimit(`ai-generate:${userId}`, { windowMs: AI_GENERATE_WINDOW_MS, max: AI_GENERATE_MAX_PER_WINDOW });
    if (!rateCheck.allowed) {
      return { success: false, error: "You're generating too quickly. Please wait a bit and try again." };
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
