import taxonomyData from "./category-taxonomy.data.json";

/** The single source of truth for PostMost's category taxonomy -- shared by the listing form, the
 *  template editor, and the AI generator so all three offer the same choices and none of them
 *  drift out of sync. Arbitrary depth: `category-taxonomy.data.json` is a recursive tree (any
 *  node's value is a map of its own children, `{}` for a leaf), not just two fixed levels.
 *
 *  That data file was parsed (not hand-typed -- at ~740 nodes that would be both slow and error
 *  prone) from OfferUp's own real category tree, gathered live level by level across an extended
 *  session and pasted in full. Top-level names mostly match OfferUp's confirmed real top-level
 *  categories directly; a few are deliberately kept as PostMost's own wording where it reads
 *  better to a reseller (`"Collectibles & Vintage"` over OfferUp's `"Art"`, `"Other"` over its
 *  `"General"`, `"Vehicles & Parts"` over its plain `"Vehicles"`, `"Pet Supplies"` over its
 *  `"Pets & Pet Supplies"`) -- the extension's OfferUp matching carries a small alias table for
 *  these instead of forcing PostMost's own naming to match OfferUp exactly. "Books, Movies &
 *  Music" is kept as its own top-level category here even though real evidence showed it's
 *  actually a subcategory nested under OfferUp's "Electronics & Media" -- same divergence, PostMost
 *  UX wins. "Health & Beauty" and "Tickets & Experiences" only go one level deep -- no full tree
 *  was gathered for those yet, so they keep the shallower subcategory lists already confirmed live.
 *
 *  Depth beyond the first two levels (Category, Subcategory) is a seller-optional refinement in
 *  the UI, never mandatory -- see childrenFor() below, used to render further levels only when
 *  they exist and the seller chooses to go deeper. The AI generator only ever guesses the first
 *  two levels (see lib/ai/generate-listing.ts) -- asking a vision model to pick from ~740 leaf
 *  options in one shot would be slow, costly, and less reliable than picking from a dozen. */
type TaxonomyTree = { [category: string]: TaxonomyTree };

const CATEGORY_TAXONOMY: TaxonomyTree = taxonomyData;

export const CATEGORIES = Object.keys(CATEGORY_TAXONOMY);

/** The options available at the Subcategory level (depth 2) for a given top-level category. Kept
 *  as its own function, unchanged in signature, since this is what the listing form, template
 *  editor, and AI generator have always called for that one level. */
export function subcategoriesFor(category: string | null | undefined): string[] {
  return Object.keys(CATEGORY_TAXONOMY[category ?? ""] ?? {});
}

/** Walks an arbitrary-depth path (e.g. [category, subcategory, ...deeper picks the seller has
 *  already made]) and returns the child options available one level below it -- `[]` once the
 *  path bottoms out at a leaf, or if any segment along the way doesn't match the tree (e.g. a
 *  legacy value from before this taxonomy existed). Used by the listing form to progressively
 *  reveal further optional levels below Subcategory. */
export function childrenFor(path: (string | null | undefined)[]): string[] {
  let node: TaxonomyTree | undefined = CATEGORY_TAXONOMY;
  for (const segment of path) {
    if (!segment || !node) return [];
    node = node[segment];
  }
  return node ? Object.keys(node) : [];
}
