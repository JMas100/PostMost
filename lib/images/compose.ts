import sharp, { Sharp } from "sharp";
import { getPhotoPreset, PhotoBackground } from "@/lib/images/presets";

export interface ComposedPhoto {
  bytes: Buffer;
  contentType: string;
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
/** Share of the canvas the subject fills, so cut-outs get marketplace-style breathing room. */
const SUBJECT_SCALE = 0.94;

/**
 * Places an image (typically a background-removal cut-out) on the requested background and
 * aspect ratio, letterboxing rather than cropping so no part of the item is ever cut off.
 */
export async function composePhoto(
  input: Buffer,
  options: { background: PhotoBackground; preset: string }
): Promise<ComposedPhoto> {
  const preset = getPhotoPreset(options.preset);
  if (!preset) throw new Error(`Unknown photo preset "${options.preset}"`);

  const canvasColor = options.background === "white" ? WHITE : TRANSPARENT;
  const trimmed = await trimTransparentEdges(input);

  if (preset.aspect === null) {
    const pipeline = sharp(trimmed).resize({
      width: preset.maxEdge,
      height: preset.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
    return encode(options.background === "white" ? pipeline.flatten({ background: WHITE }) : pipeline, options.background);
  }

  const maxWidth = preset.aspect >= 1 ? preset.maxEdge : Math.round(preset.maxEdge * preset.aspect);
  const maxHeight = preset.aspect >= 1 ? Math.round(preset.maxEdge / preset.aspect) : preset.maxEdge;

  const subject = await sharp(trimmed)
    .resize({
      width: Math.round(maxWidth * SUBJECT_SCALE),
      height: Math.round(maxHeight * SUBJECT_SCALE),
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const { width: subjectWidth = maxWidth, height: subjectHeight = maxHeight } = await sharp(subject).metadata();
  // Shrink the canvas to the smallest one of this ratio that still frames the subject at
  // SUBJECT_SCALE, so a small photo keeps its resolution instead of being upscaled into mush.
  const scale = Math.min(
    1,
    Math.max(subjectWidth / (maxWidth * SUBJECT_SCALE), subjectHeight / (maxHeight * SUBJECT_SCALE))
  );

  const canvas = sharp({
    create: {
      width: Math.round(maxWidth * scale),
      height: Math.round(maxHeight * scale),
      channels: 4,
      background: canvasColor,
    },
  }).composite([{ input: subject, gravity: "center" }]);

  return encode(canvas, options.background);
}

async function encode(pipeline: Sharp, background: PhotoBackground): Promise<ComposedPhoto> {
  if (background === "white") {
    return { bytes: await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer(), contentType: "image/jpeg" };
  }
  return { bytes: await pipeline.png({ compressionLevel: 9 }).toBuffer(), contentType: "image/png" };
}

/**
 * Cut-outs keep the source photo's framing, which leaves the subject off-centre once it is
 * placed on a fixed canvas. Trimming the empty margin re-centres it; a fully uniform image
 * has nothing to trim, so the original is kept.
 */
async function trimTransparentEdges(input: Buffer): Promise<Buffer> {
  const { hasAlpha } = await sharp(input).metadata();
  if (!hasAlpha) return input;
  try {
    return await sharp(input).trim({ background: TRANSPARENT, threshold: 0 }).png().toBuffer();
  } catch {
    return input;
  }
}
