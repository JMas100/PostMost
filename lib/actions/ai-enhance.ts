"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import {
  canRemoveBackground,
  canUseAI,
  incrementAIUsage,
  incrementBgRemovalUsage,
} from "@/lib/actions/usage";
import { BgRemovalTier } from "@/lib/plans";
import { isPremiumBgRemoverConfigured, PREMIUM_BG_REMOVER } from "@/lib/ai/background";
import {
  optimizeTitle as optimizeTitleAi,
  optimizeDescription as optimizeDescriptionAi,
  suggestPrice as suggestPriceAi,
  generatePlatformCaption as generatePlatformCaptionAi,
  enhancePhoto as enhancePhotoAi,
  formatPhoto as formatPhotoAi,
  PhotoFormatOptions,
  PricingEstimate,
  PlatformCaption,
} from "@/lib/ai/optimize";
import { DEFAULT_PHOTO_PRESET, isFormattingRequested } from "@/lib/images/presets";
import { checkRateLimit } from "@/lib/rate-limit";

// Separate from the monthly plan quotas (canUseAI/canRemoveBackground below) -- those cap total
// spend, these cap how fast it can be spent.
const AI_TEXT_WINDOW_MS = 10 * 60 * 1000;
const AI_TEXT_MAX_PER_WINDOW = 30;
const BG_REMOVAL_WINDOW_MS = 10 * 60 * 1000;
const BG_REMOVAL_MAX_PER_WINDOW = 20;

async function withAiUsage<T>(fn: () => Promise<T>): Promise<{ success: true; result: T } | { success: false; error: string }> {
  let userId: string;
  try {
    ({ workspaceUserId: userId } = await requireWorkspace());
  } catch {
    return { success: false, error: "You must be logged in." };
  }

  const rateCheck = await checkRateLimit(`ai-text:${userId}`, { windowMs: AI_TEXT_WINDOW_MS, max: AI_TEXT_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return { success: false, error: "You're doing that too quickly. Please wait a bit and try again." };
  }

  const usage = await canUseAI(userId);
  if (!usage.allowed) return { success: false, error: usage.reason || "AI usage limit reached" };

  try {
    const result = await fn();
    await incrementAIUsage(userId);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return { success: false, error: message };
  }
}

export async function optimizeTitle(data: { title: string; category?: string; platform?: string }) {
  return withAiUsage(() => optimizeTitleAi(data.title, data.category, data.platform));
}

export async function optimizeDescription(data: { description: string; category?: string; platform?: string }) {
  return withAiUsage(() => optimizeDescriptionAi(data.description, data.category, data.platform));
}

export async function suggestPrice(data: {
  imageBase64?: string;
  title?: string;
  category?: string;
  condition?: string;
}): Promise<{ success: true; result: PricingEstimate } | { success: false; error: string }> {
  return withAiUsage(() => suggestPriceAi(data.imageBase64, data.title, data.category, data.condition));
}

export async function generatePlatformCaption(data: {
  title: string;
  description: string;
  platform: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  condition?: string | null;
}): Promise<{ success: true; result: PlatformCaption } | { success: false; error: string }> {
  return withAiUsage(() =>
    generatePlatformCaptionAi(data.title, data.description, data.platform, {
      brand: data.brand,
      size: data.size,
      color: data.color,
      material: data.material,
      condition: data.condition,
    })
  );
}

/** Whether the studio tier can be offered at all, so the UI can hide it when unconfigured. */
export async function isStudioRemovalAvailable(): Promise<boolean> {
  return isPremiumBgRemoverConfigured();
}

/** `code` marks failures that apply to every subsequent photo too, so batch callers stop on them. */
export type RemovalFailure = { success: false; error: string; code?: "quota" | "auth" };

async function runRemoval(
  userId: string,
  dataUrl: string,
  tier: BgRemovalTier,
  format?: PhotoFormatOptions
): Promise<{ success: true; result: string } | RemovalFailure> {
  const quota = await canRemoveBackground(userId, tier);
  if (!quota.allowed) {
    return { success: false, error: quota.reason || "Background removal limit reached", code: "quota" };
  }

  try {
    const result = await enhancePhotoAi(dataUrl, tier === "studio" ? PREMIUM_BG_REMOVER : undefined, format);
    await incrementBgRemovalUsage(userId, tier);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background removal failed";
    return { success: false, error: message };
  }
}

export async function enhancePhoto(
  dataUrl: string,
  options: { tier?: BgRemovalTier; format?: PhotoFormatOptions } = {}
): Promise<{ success: true; result: string; tier: BgRemovalTier } | RemovalFailure> {
  const requestedTier: BgRemovalTier = options.tier ?? "standard";
  const format = options.format;
  let userId: string;
  try {
    ({ workspaceUserId: userId } = await requireWorkspace());
  } catch {
    return { success: false, error: "You must be logged in.", code: "auth" };
  }

  const rateCheck = await checkRateLimit(`bg-removal:${userId}`, { windowMs: BG_REMOVAL_WINDOW_MS, max: BG_REMOVAL_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return { success: false, error: "You're removing backgrounds too quickly. Please wait a bit and try again." };
  }

  // Studio is a best-effort upgrade: an unconfigured or failing premium provider (missing key,
  // exhausted credits, provider outage) degrades to the standard remover instead of erroring.
  if (requestedTier === "studio") {
    if (isPremiumBgRemoverConfigured()) {
      const studio = await runRemoval(userId, dataUrl, "studio", format);
      if (studio.success) return { ...studio, tier: "studio" };
      const quota = await canRemoveBackground(userId, "studio");
      // A quota/plan rejection is a product decision, not a provider failure: surface it.
      if (!quota.allowed) return { ...studio, code: "quota" };
    }
    const fallback = await runRemoval(userId, dataUrl, "standard", format);
    return fallback.success ? { ...fallback, tier: "standard" } : fallback;
  }

  const standard = await runRemoval(userId, dataUrl, "standard", format);
  return standard.success ? { ...standard, tier: "standard" } : standard;
}

/**
 * Background/aspect formatting only. This runs locally (sharp, no provider call), so it is not
 * metered against the background-removal quotas — it just needs a signed-in user.
 */
export async function formatPhoto(
  url: string,
  format: PhotoFormatOptions
): Promise<{ success: true; result: string } | { success: false; error: string; code?: "auth" }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "You must be logged in.", code: "auth" };

  const preset = format.preset || DEFAULT_PHOTO_PRESET;
  if (!isFormattingRequested(format.background, preset)) {
    return { success: false, error: "Pick a background or size first" };
  }

  try {
    return { success: true, result: await formatPhotoAi(url, { background: format.background, preset }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to format photo" };
  }
}
