import { createManualAdapter } from "../automation/create-adapter";
import { uploadPhotoOnPage } from "../automation/playwright-runner";
import type { AutomationStep } from "../automation/playwright-runner";
import type { ListingData } from "../types";

// Poshmark's real create-listing form (verified live 2026-09-16, see chat history for the DOM
// dump this was built from) doesn't use plain name/placeholder attributes the generic
// defaultListingSteps looks for -- it's a Vue app with vee-validate `data-vv-name` attributes on
// text fields, and Category/Size/Condition are all custom click-to-open dropdown menus, not real
// <select> elements. The generic fallback silently filled nothing at all on this platform before
// this was written -- every field stayed blank and the submit click never even fired (the button
// says "Next", not "Post"/"Publish"/"List"/"Submit", and has no type="submit").
// PostMost's own category taxonomy (components/listing-form/step-details.tsx) is organized by
// item type -- "Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports",
// "Vintage", "Other". Poshmark's top-level taxonomy is organized by audience instead (Women/Men/
// Kids/Home/Pets/Electronics), so three of ours (Electronics, Home, Toys) map straight across
// with no ambiguity. For the rest, `listing.audience` ("Women"/"Men"/"Kids"/"Unisex", set via the
// listing form's own "Who's it for?" field -- see prisma/schema.prisma's Listing.audience) is the
// real signal now; keyword-matching the title/description is kept only as a fallback for listings
// created before that field existed.
const DIRECT_CATEGORY_MAP: Record<string, string> = {
  electronics: "electronics",
  home: "home",
  toys: "kids",
};

const AUDIENCE_FIELD_MAP: Record<string, string> = {
  women: "women",
  men: "men",
  kids: "kids",
  // "Unisex" has no equivalent Poshmark bucket -- falls through to keyword-matching below.
};

const AUDIENCE_KEYWORDS: { slug: string; keywords: string[] }[] = [
  { slug: "women", keywords: ["women", "woman", "womens", "ladies", "her", "hers", "girl", "girls"] },
  { slug: "men", keywords: ["men", "man", "mens", "menswear", "his", "guy", "guys", "boy", "boys"] },
  { slug: "kids", keywords: ["kid", "kids", "child", "children", "baby", "toddler", "youth", "infant"] },
];

function matchPoshmarkCategory(listing: ListingData): string {
  const directMatch = DIRECT_CATEGORY_MAP[listing.category.toLowerCase()];
  if (directMatch) return directMatch;

  const audienceMatch = listing.audience ? AUDIENCE_FIELD_MAP[listing.audience.toLowerCase()] : undefined;
  if (audienceMatch) return audienceMatch;

  const haystack = `${listing.title} ${listing.description}`.toLowerCase();
  for (const { slug, keywords } of AUDIENCE_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return slug;
  }
  // Category is the one field Poshmark marks required with a hard asterisk -- fail loudly with
  // an actionable message (and a fix the user can actually make) rather than silently guessing a
  // bucket the item doesn't belong in.
  throw new Error(
    `Couldn't tell who this "${listing.category}" listing is for -- Poshmark requires a Women/Men/Kids/Home/Pets/Electronics category. Set "Who's it for?" on the listing (or add a word like "women's"/"men's" to the title) and try again.`
  );
}

const CONDITION_MATCHERS: { code: string; keywords: string[] }[] = [
  { code: "nwt", keywords: ["new with tags", "nwt", "brand new", "new"] },
  { code: "uln", keywords: ["like new", "excellent"] },
  { code: "ug", keywords: ["good"] },
  { code: "uf", keywords: ["fair", "used", "poor", "worn"] },
];

function matchPoshmarkCondition(listing: ListingData): string {
  const haystack = listing.condition.toLowerCase();
  for (const { code, keywords } of CONDITION_MATCHERS) {
    if (keywords.some((kw) => haystack.includes(kw))) return code;
  }
  // Unlike category (which determines where the listing is even found), an imprecise condition
  // default costs much less -- default to Good rather than failing the whole post over it.
  return "ug";
}

const poshmarkListingSteps: AutomationStep[] = [
  {
    name: "fill-title",
    action: async (page, listing) => {
      await page.locator('input[data-vv-name="title"]').fill(listing.title.slice(0, 80));
    },
  },
  {
    name: "fill-description",
    action: async (page, listing) => {
      await page.locator('textarea[data-vv-name="description"]').fill(listing.description.slice(0, 1500));
    },
  },
  {
    name: "upload-photos",
    action: async (page, listing) => {
      for (let i = 0; i < Math.min(listing.photos.length, 16); i++) {
        const ok = await uploadPhotoOnPage(page, "#img-file-input", listing.photos[i], i);
        if (!ok) break;
      }
    },
  },
  {
    name: "select-category",
    action: async (page, listing) => {
      const slug = matchPoshmarkCategory(listing);
      await page.locator('.listing-editor__category-container [data-test="dropdown"]').first().click();
      await page.waitForTimeout(200);
      await page.locator(`.listing-editor__category-container a[data-et-name="${slug}"]`).first().click();
    },
  },
  {
    name: "select-condition",
    action: async (page, listing) => {
      const code = matchPoshmarkCondition(listing);
      await page.locator('.listing-editor__condition-container [data-test="dropdown"]').first().click();
      await page.waitForTimeout(200);
      await page.locator(`.listing-editor__condition-container div[data-et-prop-content="${code}"]`).first().click();
    },
  },
  {
    name: "fill-price",
    action: async (page, listing) => {
      // Clicking the page-level price field opens a "Listing Price" modal with its own separate
      // input -- confirmed live, not a normal inline field. Smart Sell defaults ON inside that
      // modal and requires its own Minimum Price field; turning it off avoids a second required
      // field we have no real minimum-price business logic for.
      await page.locator('input[data-vv-name="listingPrice"]').click();
      const modalPriceInput = page.locator("#listing-price-modal-listing-price-input");
      await modalPriceInput.waitFor({ state: "visible", timeout: 5000 });
      await modalPriceInput.fill(String(Math.round(listing.price)));

      const smartSellInput = page.locator('[data-test="toggle-input"]').first();
      const smartSellLabel = page.locator('label[data-test="toggle-switch"]').first();
      if (await smartSellInput.isChecked().catch(() => false)) {
        await smartSellLabel.click();
      }
      await page.waitForTimeout(300);
      await page.locator('div[data-test="modal-container"] button:has-text("Done")').first().click();
    },
  },
  {
    name: "submit-form",
    action: async (page) => {
      // Real button text is "Next" with no type="submit" -- none of defaultListingSteps'
      // generic submit selectors (button[type="submit"], :has-text("Post"/"Publish"/"List"/
      // "Submit")) ever matched it, so the click never fired at all before this was written.
      await page.locator('button[data-et-name="next"]').first().click();
      await page.waitForTimeout(2000);
    },
  },
];

export const poshmarkAdapter = createManualAdapter({
  id: "poshmark",
  name: "Poshmark",
  loginUrl: "https://poshmark.com/login",
  listingUrl: "https://poshmark.com/create-listing",
  usernameSelector: "input[name=\"login_form[username_email]\"]",
  passwordSelector: "input[name=\"login_form[password]\"]",
  submitSelector: "button[type=\"submit\"]",
  preSubmitSteps: poshmarkListingSteps,
  // Runs at publish time, before any browser automation, so the user finds out "Poshmark needs
  // to know who this is for" immediately in the publish UI -- not minutes later as a job failure
  // after a real browser already spent time on it.
  validateListing(listing) {
    try {
      matchPoshmarkCategory(listing);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
  // Delete-flow selectors are still best-effort, written from general knowledge of Poshmark's
  // UI -- not verified against a live account like the create-listing flow above now is. Needs
  // real-account testing before it's trusted.
  delete: {
    openMenuSelectors: [
      "[aria-label='More options']",
      "button:has-text('...')",
      "[data-et-name='more_options']",
    ],
    deleteSelectors: [
      "text=Delete Listing",
      "button:has-text('Delete Listing')",
      "a:has-text('Delete Listing')",
    ],
    confirmSelectors: [
      "button:has-text('Yes, Delete It')",
      "button:has-text('Delete')",
      "button:has-text('Confirm')",
    ],
  },
  // Same caveat as delete: best-effort, unverified against a live account.
  reprice: {
    editTriggerSelectors: [
      "a:has-text('Edit Listing')",
      "button:has-text('Edit')",
      "[data-et-name='edit_listing']",
    ],
    priceSelectors: [
      "input[name=\"listing[price]\"]",
      "input[id*=\"price\" i]",
      "input[placeholder*=\"price\" i]",
    ],
    saveSelectors: [
      "button:has-text('Save Changes')",
      "button:has-text('Save')",
      "button[type=\"submit\"]",
    ],
  },
});
