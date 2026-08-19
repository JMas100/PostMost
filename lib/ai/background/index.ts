import { biRefNetRemover } from "@/lib/ai/background/adapters/birefnet";
import { photoRoomRemover } from "@/lib/ai/background/adapters/photoroom";
import { BackgroundRemover } from "@/lib/ai/background/types";

const removers: Record<string, BackgroundRemover> = {
  birefnet: biRefNetRemover,
  photoroom: photoRoomRemover,
};

export const DEFAULT_BG_REMOVER = "birefnet";

/** Provider used for the premium "studio quality" retry, when configured. */
export const PREMIUM_BG_REMOVER = "photoroom";

/** Whether the premium provider has credentials, i.e. whether the studio tier can run at all. */
export function isPremiumBgRemoverConfigured(): boolean {
  return removers[PREMIUM_BG_REMOVER]?.isConfigured() ?? false;
}

export function getBackgroundRemover(provider = process.env.BG_REMOVER || DEFAULT_BG_REMOVER): BackgroundRemover {
  const remover = removers[provider];
  if (!remover) {
    throw new Error(`Unknown BG_REMOVER "${provider}". Available: ${Object.keys(removers).join(", ")}`);
  }
  return remover;
}

/** First configured remover, preferring BG_REMOVER, so a missing key degrades instead of failing. */
export function getConfiguredBackgroundRemover(): BackgroundRemover | null {
  const preferred = process.env.BG_REMOVER || DEFAULT_BG_REMOVER;
  const order = [preferred, ...Object.keys(removers).filter((id) => id !== preferred)];
  for (const id of order) {
    const remover = removers[id];
    if (remover?.isConfigured()) return remover;
  }
  return null;
}

export type { BackgroundRemover, RemovedBackground } from "@/lib/ai/background/types";
