"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canRemoveBackground,
  canUseAI,
  incrementAIUsage,
  incrementBgRemovalUsage,
} from "@/lib/actions/usage";
import { BgRemovalTier } from "@/lib/plans";
import { PREMIUM_BG_REMOVER } from "@/lib/ai/background";
import {
  optimizeTitle as optimizeTitleAi,
  optimizeDescription as optimizeDescriptionAi,
  suggestPrice as suggestPriceAi,
  generatePlatformCaption as generatePlatformCaptionAi,
  enhancePhoto as enhancePhotoAi,
  PricingEstimate,
  PlatformCaption,
} from "@/lib/ai/optimize";

async function withAiUsage<T>(fn: () => Promise<T>): Promise<{ success: true; result: T } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be logged in." };

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

export async function enhancePhoto(
  dataUrl: string,
  options: { tier?: BgRemovalTier } = {}
): Promise<{ success: true; result: string } | { success: false; error: string }> {
  const tier: BgRemovalTier = options.tier ?? "standard";
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be logged in." };

  const quota = await canRemoveBackground(userId, tier);
  if (!quota.allowed) return { success: false, error: quota.reason || "Background removal limit reached" };

  try {
    const result = await enhancePhotoAi(dataUrl, tier === "studio" ? PREMIUM_BG_REMOVER : undefined);
    await incrementBgRemovalUsage(userId, tier);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background removal failed";
    return { success: false, error: message };
  }
}
