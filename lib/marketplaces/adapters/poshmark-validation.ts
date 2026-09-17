import type { ListingData } from "../types";

/** Pulled out of poshmark.ts on purpose: this file has zero runtime imports (only a type-only
 *  import above, erased at build time), unlike poshmark.ts itself which transitively pulls in
 *  Playwright through create-adapter.ts -- so this one is safe to import directly from a "use
 *  client" component (the listing wizard's platform picker) to show the same warning live,
 *  before the user ever clicks Publish, instead of only after a job fails. */

// PostMost's own category taxonomy (components/listing-form/step-details.tsx) is organized by
// item type -- "Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports",
// "Vintage", "Other". Poshmark's top-level taxonomy is organized by audience instead -- all six
// of Women/Men/Kids/Home/Pets/Electronics are reachable here: three of ours (Electronics, Home,
// Toys) map straight across with no ambiguity, and the rest come from `listing.audience`
// ("Women"/"Men"/"Kids"/"Unisex"/"Pets", set via the listing form's own "Who's it for?" field --
// see prisma/schema.prisma's Listing.audience), which is the real signal now; keyword-matching
// the title/description is kept only as a fallback for listings created before that field existed.
const DIRECT_CATEGORY_MAP: Record<string, string> = {
  electronics: "electronics",
  home: "home",
  toys: "kids",
};

const AUDIENCE_FIELD_MAP: Record<string, string> = {
  women: "women",
  men: "men",
  kids: "kids",
  pets: "pets",
  // "Unisex" has no equivalent Poshmark bucket -- falls through to keyword-matching below.
};

const AUDIENCE_KEYWORDS: { slug: string; keywords: string[] }[] = [
  { slug: "women", keywords: ["women", "woman", "womens", "ladies", "her", "hers", "girl", "girls"] },
  { slug: "men", keywords: ["men", "man", "mens", "menswear", "his", "guy", "guys", "boy", "boys"] },
  { slug: "kids", keywords: ["kid", "kids", "child", "children", "baby", "toddler", "youth", "infant"] },
  { slug: "pets", keywords: ["pet", "pets", "dog", "cat", "puppy", "kitten"] },
];

type CategoryInput = Pick<ListingData, "category" | "audience" | "title" | "description">;

// Plain substring matching is genuinely unsafe for short, common words -- "her" matches inside
// "here"/"there"/"other", "man" matches inside "woman"/"demand". Word-boundary matching (real
// words in the haystack, not just any substring) avoids a title like "...clue here" spuriously
// resolving to "women" through no fault of the seller's.
function includesWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
}

export function matchPoshmarkCategory(listing: CategoryInput): string {
  const directMatch = DIRECT_CATEGORY_MAP[listing.category.toLowerCase()];
  if (directMatch) return directMatch;

  const audienceMatch = listing.audience ? AUDIENCE_FIELD_MAP[listing.audience.toLowerCase()] : undefined;
  if (audienceMatch) return audienceMatch;

  const haystack = `${listing.title} ${listing.description}`.toLowerCase();
  for (const { slug, keywords } of AUDIENCE_KEYWORDS) {
    if (keywords.some((kw) => includesWord(haystack, kw))) return slug;
  }
  // Category is the one field Poshmark marks required with a hard asterisk -- fail loudly with
  // an actionable message (and a fix the user can actually make) rather than silently guessing a
  // bucket the item doesn't belong in.
  throw new Error(
    `Couldn't tell who this "${listing.category}" listing is for -- Poshmark requires a Women/Men/Kids/Home/Pets/Electronics category. Set "Who's it for?" on the listing (or add a word like "women's"/"men's" to the title) and try again.`
  );
}

export function checkPoshmarkListing(listing: CategoryInput): { valid: true } | { valid: false; error: string } {
  try {
    matchPoshmarkCategory(listing);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
