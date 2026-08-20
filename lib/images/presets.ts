import { PlatformId } from "@/lib/marketplaces/platforms";

export type PhotoBackground = "transparent" | "white";

export interface PhotoPreset {
  id: string;
  label: string;
  /** Target aspect ratio as width / height; null keeps the source ratio. */
  aspect: number | null;
  /** Longest-edge pixel budget; marketplaces reject/downscale far beyond this. */
  maxEdge: number;
  /** Marketplaces whose recommended ratio this matches, shown as the preset hint. */
  platforms: PlatformId[];
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  { id: "original", label: "Original ratio", aspect: null, maxEdge: 1600, platforms: [] },
  {
    id: "square",
    label: "Square 1:1",
    aspect: 1,
    maxEdge: 1600,
    platforms: ["ebay", "poshmark", "mercari", "depop", "facebook"],
  },
  { id: "landscape", label: "Landscape 4:3", aspect: 4 / 3, maxEdge: 2000, platforms: ["etsy"] },
  { id: "portrait", label: "Portrait 4:5", aspect: 4 / 5, maxEdge: 1600, platforms: ["vinted", "grailed"] },
];

export const DEFAULT_PHOTO_PRESET = "original";

export function getPhotoPreset(id: string): PhotoPreset | undefined {
  return PHOTO_PRESETS.find((p) => p.id === id);
}

/** Whether the options would change the image at all, so callers can skip a no-op round trip. */
export function isFormattingRequested(background: PhotoBackground, presetId: string): boolean {
  return background === "white" || presetId !== DEFAULT_PHOTO_PRESET;
}
