export interface PricingEstimate {
  price: number;
  reasoning?: string;
}

export interface PlatformCaption {
  title: string;
  description: string;
}

interface TextContentPart {
  type: "text";
  text: string;
}

interface ImageContentPart {
  type: "image_url";
  image_url: { url: string; detail: "low" | "high" | "auto" };
}

type OpenAIContent = TextContentPart | ImageContentPart;

async function imageToBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  if (!url.startsWith("data:")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { blob: new Blob([buffer], { type: mime }), filename: `photo.${mime.split("/").pop() || "jpg"}` };
  }

  const [header, base64] = url.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const ext = mime.split("/").pop() || "jpg";
  const buffer = Buffer.from(base64, "base64");
  return { blob: new Blob([buffer], { type: mime }), filename: `photo.${ext}` };
}

async function openaiJson<T>(messages: { role: "system" | "user"; content: OpenAIContent[] | string }[], maxTokens = 600): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }
}

function platformTone(platform: string): string {
  const tones: Record<string, string> = {
    poshmark: "friendly, emoji-friendly, social-resale tone",
    mercari: "brief, honest, buyer-focused",
    depop: "trendy, short, Gen-Z resale style",
    vinted: "simple, casual, community resale",
    grailed: "menswear enthusiast, detail-oriented, brand-aware",
    facebook: "local marketplace, direct and clear",
    offerup: "local selling, straightforward",
    craigslist: "minimal, no fluff, practical",
    ebay: "keyword-rich, detailed specs, search-optimized",
    etsy: "handmade/vintage story, warm and descriptive",
  };
  return tones[platform.toLowerCase()] || "general marketplace listing";
}

export async function optimizeTitle(input: string, category?: string, platform?: string): Promise<string> {
  const result = await openaiJson<{ title?: string }>(
    [
      {
        role: "system",
        content:
          "You optimize marketplace listing titles. Return JSON with key 'title' only. Keep under 80 characters, keyword-rich, no punctuation spam.",
      },
      {
        role: "user",
        content: `Original title: ${input}\nCategory: ${category || "general"}\nMarketplace: ${platform || "general"}\nTone: ${platformTone(platform || "")}\nRewrite the title.`,
      },
    ],
    150
  );
  return result.title?.slice(0, 80) || input;
}

export async function optimizeDescription(input: string, category?: string, platform?: string): Promise<string> {
  const result = await openaiJson<{ description?: string }>(
    [
      {
        role: "system",
        content:
          "You optimize marketplace listing descriptions. Return JSON with key 'description' only. 2-4 sentences, persuasive, honest, no extra markdown.",
      },
      {
        role: "user",
        content: `Original description: ${input}\nCategory: ${category || "general"}\nMarketplace: ${platform || "general"}\nTone: ${platformTone(platform || "")}\nRewrite the description.`,
      },
    ],
    400
  );
  return result.description || input;
}

export async function suggestPrice(imageBase64?: string, title?: string, category?: string, condition?: string): Promise<PricingEstimate> {
  const content: OpenAIContent[] = [
    {
      type: "text",
      text: `Estimate a competitive resale price in USD for this item.\nTitle: ${title || "N/A"}\nCategory: ${category || "N/A"}\nCondition: ${condition || "N/A"}\nReturn JSON with keys "price" (number) and "reasoning" (one sentence).`,
    },
  ];
  if (imageBase64) {
    content.push({ type: "image_url", image_url: { url: imageBase64, detail: "low" } });
  }
  const result = await openaiJson<{ price?: number; reasoning?: string }>(
    [{ role: "system", content: "You are a pricing assistant for resellers. Return only the requested JSON." }, { role: "user", content }],
    200
  );
  return { price: typeof result.price === "number" ? Math.max(0, Number(result.price.toFixed(2))) : 0, reasoning: result.reasoning };
}

export async function generatePlatformCaption(
  title: string,
  description: string,
  platform: string,
  fields?: { brand?: string | null; size?: string | null; color?: string | null; material?: string | null; condition?: string | null }
): Promise<PlatformCaption> {
  const details = Object.entries(fields || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const result = await openaiJson<{ title?: string; description?: string }>(
    [
      {
        role: "system",
        content:
          "You rewrite a marketplace listing for a specific platform. Return JSON with keys 'title' and 'description'. Keep title under 80 characters and description concise.",
      },
      {
        role: "user",
        content: `Platform: ${platform}\nTone: ${platformTone(platform)}\nOriginal title: ${title}\nOriginal description: ${description}\n${details ? `Item details:\n${details}` : ""}\nGenerate the platform-specific title and description.`,
      },
    ],
    500
  );
  return {
    title: result.title?.slice(0, 80) || title,
    description: result.description || description,
  };
}

export async function removeBackground(imageUrl: string): Promise<string> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) throw new Error("Background removal API key not configured");

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
    const text = await res.text();
    throw new Error(`Remove.bg failed: ${res.status} ${text}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function enhancePhoto(imageUrl: string): Promise<string> {
  // MVP fallback: if REMOVE_BG_API_KEY is configured, remove background.
  // In the future this can upscale, correct lighting, etc.
  return removeBackground(imageUrl);
}
