import { BackgroundRemover, RemovedBackground } from "@/lib/ai/background/types";

const FAL_ENDPOINT = "https://fal.run/fal-ai/birefnet/v2";

interface FalBirefnetResponse {
  image?: { url?: string; content_type?: string };
}

/**
 * BiRefNet (MIT-licensed weights) hosted on fal. Billed per GPU-second rather than per
 * image, which is what makes unlimited background removal affordable.
 */
export const biRefNetRemover: BackgroundRemover = {
  id: "birefnet",

  isConfigured(): boolean {
    return Boolean(process.env.FAL_KEY);
  },

  async removeBackground(imageUrl: string): Promise<RemovedBackground> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) throw new Error("FAL_KEY is not configured");

    const res = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        model: process.env.BIREFNET_MODEL || "General Use (Light)",
        operating_resolution: process.env.BIREFNET_RESOLUTION || "1024x1024",
        output_format: "png",
        refine_foreground: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`BiRefNet failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as FalBirefnetResponse;
    const url = data.image?.url;
    if (!url) throw new Error("BiRefNet returned no image");

    const image = await fetch(url);
    if (!image.ok) throw new Error(`Failed to download BiRefNet result: ${image.status}`);

    return {
      bytes: Buffer.from(await image.arrayBuffer()),
      contentType: data.image?.content_type || "image/png",
    };
  },
};
