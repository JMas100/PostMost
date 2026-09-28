import { CATEGORIES, subcategoriesFor } from "@/lib/category-taxonomy";

export interface GeneratedListing {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string;
  /** The specific subcategory for whichever `category` was picked (e.g. "Water Sports" under
   *  "Sports & Outdoors") -- lets the extension auto-select a real marketplace subcategory
   *  instead of leaving it for the seller to pick by hand. Validated against
   *  lib/category-taxonomy.ts's tree for that category; null if the model's guess doesn't match
   *  any real subcategory rather than forcing a wrong one. */
  categoryDetail?: string | null;
  audience?: string | null;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
}

const CATEGORY_TREE_LINES = CATEGORIES.map((c) => `  - ${c}: ${subcategoriesFor(c).join(", ")}`).join("\n");

const SYSTEM_PROMPT = `You are an expert reseller listing assistant. Analyze the provided product image and generate a compelling marketplace listing.

Respond with a JSON object containing exactly these keys:
- title: a short, keyword-rich product title (max 80 characters)
- description: a concise, persuasive description (2-4 sentences)
- price: a numeric estimated resale price in USD (number, no dollar sign)
- quantity: always 1 unless the image clearly shows a multi-pack or lot (number)
- condition: one of "New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"
- category: one of these top-level categories, and categoryDetail: the matching subcategory listed
  under whichever one you picked (null only if genuinely nothing on the image indicates one):
${CATEGORY_TREE_LINES}
- audience: who the item is for -- one of "Women", "Men", "Kids", "Unisex", "Pets", or null if not
  applicable (e.g. Electronics, Home & Garden) or genuinely unclear from the image
- brand: the visible brand name, or null if unknown
- size: the size if visible or inferable, or null
- color: the dominant color, or null
- material: the primary material if visible or inferable, or null

Use only valid JSON. Do not include markdown or explanation.`;

function pickCondition(raw?: string): string {
  const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
  const normalized = raw?.toLowerCase() ?? "";
  const match = conditions.find((c) => c.toLowerCase() === normalized);
  return match ?? "Good";
}

function pickCategory(raw?: string): string {
  const normalized = raw?.toLowerCase() ?? "";
  const match = CATEGORIES.find((c) => c.toLowerCase() === normalized);
  return match ?? "Other";
}

function pickSubcategory(category: string, raw?: string | null): string | null {
  const normalized = raw?.toLowerCase().trim() ?? "";
  if (!normalized) return null;
  const match = subcategoriesFor(category).find((s) => s.toLowerCase() === normalized);
  return match ?? null;
}

function pickAudience(raw?: string | null): string | null {
  const audiences = ["Women", "Men", "Kids", "Unisex", "Pets"];
  const normalized = raw?.toLowerCase() ?? "";
  return audiences.find((a) => a.toLowerCase() === normalized) ?? null;
}

export async function generateListingFromImage(imageBase64: string): Promise<GeneratedListing> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("AI photo analysis isn't configured (missing OPENAI_API_KEY).");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageBase64, detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI generation failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<GeneratedListing>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const category = pickCategory(parsed.category);

  return {
    title: parsed.title?.slice(0, 80) || "Untitled listing",
    description: parsed.description || "",
    price: typeof parsed.price === "number" ? Math.max(0, parsed.price) : 0,
    quantity: typeof parsed.quantity === "number" ? Math.max(1, Math.round(parsed.quantity)) : 1,
    condition: pickCondition(parsed.condition),
    category,
    categoryDetail: pickSubcategory(category, parsed.categoryDetail),
    audience: pickAudience(parsed.audience),
    brand: parsed.brand || null,
    size: parsed.size || null,
    color: parsed.color || null,
    material: parsed.material || null,
  };
}
