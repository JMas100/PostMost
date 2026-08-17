import { imageToBlob } from "@/lib/ai/background/image";
import { BackgroundRemover, RemovedBackground } from "@/lib/ai/background/types";

export const removeBgRemover: BackgroundRemover = {
  id: "removebg",

  isConfigured(): boolean {
    return Boolean(process.env.REMOVE_BG_API_KEY);
  },

  async removeBackground(imageUrl: string): Promise<RemovedBackground> {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) throw new Error("REMOVE_BG_API_KEY is not configured");

    const { blob, filename } = await imageToBlob(imageUrl);
    const form = new FormData();
    form.append("image_file", blob, filename);
    form.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Remove.bg failed: ${res.status} ${await res.text()}`);
    }

    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: "image/png" };
  },
};
