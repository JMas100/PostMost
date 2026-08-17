import { imageToBlob } from "@/lib/ai/background/image";
import { BackgroundRemover, RemovedBackground } from "@/lib/ai/background/types";

/**
 * PhotoRoom Remove Background API. Prefixing the key with `sandbox_` (their convention)
 * returns watermarked results without consuming paid credits.
 */
export const photoRoomRemover: BackgroundRemover = {
  id: "photoroom",

  isConfigured(): boolean {
    return Boolean(process.env.PHOTOROOM_API_KEY);
  },

  async removeBackground(imageUrl: string): Promise<RemovedBackground> {
    const apiKey = process.env.PHOTOROOM_API_KEY;
    if (!apiKey) throw new Error("PHOTOROOM_API_KEY is not configured");

    const { blob, filename } = await imageToBlob(imageUrl);
    const form = new FormData();
    form.append("image_file", blob, filename);
    form.append("format", "png");

    const res = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`PhotoRoom failed: ${res.status} ${await res.text()}`);
    }

    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: "image/png" };
  },
};
