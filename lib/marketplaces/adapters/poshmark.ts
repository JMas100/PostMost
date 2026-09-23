import { createManualAdapter } from "../automation/create-adapter";
import { uploadPhotoOnPage } from "../automation/playwright-runner";
import type { AutomationStep } from "../automation/playwright-runner";
import type { ListingData } from "../types";
import { matchPoshmarkCategory, checkPoshmarkListing } from "./poshmark-validation";

// Poshmark's real create-listing form (verified live 2026-09-16, see chat history for the DOM
// dump this was built from) doesn't use plain name/placeholder attributes the generic
// defaultListingSteps looks for -- it's a Vue app with vee-validate `data-vv-name` attributes on
// text fields, and Category/Size/Condition are all custom click-to-open dropdown menus, not real
// <select> elements. The generic fallback silently filled nothing at all on this platform before
// this was written -- every field stayed blank and the submit click never even fired (the button
// says "Next", not "Post"/"Publish"/"List"/"Submit", and has no type="submit").
// Category/audience matching itself lives in ./poshmark-validation.ts -- kept free of Playwright
// imports so the listing wizard (a "use client" component) can run the same check live, before
// the user ever clicks Publish. See that file for the full mapping rationale.

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

/** The per-photo crop/confirm modal (see upload-photos below) still slipped through once with
 *  only a 3s post-upload check -- real image processing on Poshmark's end apparently sometimes
 *  takes longer than that to even start rendering it. Longer timeout here, and called again
 *  defensively right before the category click (the step it was actually blocking) as a second
 *  line of defense regardless of root timing cause. */
async function dismissImageCropModalIfOpen(page: import("playwright-core").Page): Promise<void> {
  const applyCropButton = page.locator('div[data-test="modal-container"] button:has-text("Apply")');
  if (await applyCropButton.isVisible({ timeout: 8000 }).catch(() => false)) {
    await applyCropButton.click();
    await page.waitForTimeout(300);
  }
}

/** A real job showed the crop modal appearing *between* dismissImageCropModalIfOpen's own check
 *  and a later click landing (screenshot: modal open on top of an already-open category dropdown),
 *  since Poshmark's image processing that triggers it is async and isn't bound to that one-time
 *  check. A plain click() then retries against the same intercepted target for its whole timeout
 *  and never recovers. This interleaves dismissal attempts with the click itself so a modal that
 *  appears mid-click gets caught instead of stalling out the full 30s. */
async function clickDismissingCropModal(
  page: import("playwright-core").Page,
  locator: import("playwright-core").Locator,
  maxAttempts = 6
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts - 1; attempt++) {
    try {
      await locator.click({ timeout: 4000 });
      return;
    } catch {
      await dismissImageCropModalIfOpen(page);
    }
  }
  // Final attempt without a caught retry, so a real, unrelated failure still surfaces.
  await locator.click();
}

const poshmarkListingSteps: AutomationStep[] = [
  {
    name: "dismiss-transient-error-dialog",
    action: async (page) => {
      // Confirmed live and reproducible manually: Poshmark shows a dismissible "Error / Sorry!
      // You cannot currently perform this request. Please reach out to Poshmark Support for
      // assistance." dialog on a fresh page load sometimes -- confirmed with the account owner
      // that clicking it away lets the page work normally afterward, so this isn't a real block,
      // just a startup notice to clear first. It sits on top of everything else (including the
      // cookie banner below), so checked first. Best-effort: a no-op if it's not there.
      const errorDialogButton = page
        .locator('div[data-test="modal-container"]')
        .filter({ hasText: "Sorry! You cannot currently perform this request" })
        .getByRole("button")
        .first();
      if (await errorDialogButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await errorDialogButton.click();
        await page.waitForTimeout(300);
      }
    },
  },
  {
    name: "dismiss-cookie-banner",
    action: async (page) => {
      // Confirmed via a real job's Playwright error trace: a `.cookie-banner` sits on the page
      // and intercepts clicks on the category/condition dropdowns further down (and likely the
      // sticky header interceptions seen in the same trace too -- both plausibly downstream of
      // this banner still occupying layout space). Dismissed once, up front, rather than worked
      // around at each dropdown. Best-effort: a no-op if it's not there.
      const cookieBannerButton = page.locator(".cookie-banner button").first();
      if (await cookieBannerButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieBannerButton.click();
        await page.waitForTimeout(200);
      }
    },
  },
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
      // Poshmark opens a crop/confirm modal after each individual photo upload (a real screenshot
      // from a failed job showed it directly -- zoom slider, "Replace Photo", Cancel/Apply) that
      // sits on top of the page and blocks every subsequent click, including the category
      // dropdown, until dismissed. Best-effort and per-photo: if it doesn't appear (a future
      // Poshmark change, or a different account state), this is a no-op rather than a failure.
      for (let i = 0; i < Math.min(listing.photos.length, 16); i++) {
        const ok = await uploadPhotoOnPage(page, "#img-file-input", listing.photos[i], i);
        if (!ok) break;
        await dismissImageCropModalIfOpen(page);
      }
    },
  },
  {
    name: "select-category",
    action: async (page, listing) => {
      // Confirmed live: the per-photo dismissal above isn't always enough on its own -- a real
      // job still hit the category dropdown with the crop modal still open. Checked again here,
      // right before the click it was actually blocking, regardless of why the first check missed it.
      await dismissImageCropModalIfOpen(page);
      const slug = matchPoshmarkCategory(listing);
      await clickDismissingCropModal(
        page,
        page.locator('.listing-editor__category-container [data-test="dropdown"]').first()
      );
      await page.waitForTimeout(200);
      await clickDismissingCropModal(
        page,
        page.locator(`.listing-editor__category-container a[data-et-name="${slug}"]`).first()
      );
      await page.waitForTimeout(400);
      // Confirmed live (real session exploration, 2026-09-19): clicking the top-level link above
      // only drills into a second-level list -- it does NOT finalize Category by itself, which is
      // the real reason it kept showing "Select Category" no matter how long we waited after that
      // click alone. A second-level item has to be picked too. Those items carry no stable
      // data-et-name (unlike the top-level ones), only visible text, so matched by exact text --
      // "Other" always exists as a catch-all in every list and was confirmed live to both finalize
      // Category *and* auto-default Size to "OS", sidestepping needing a real size-taxonomy
      // mapping entirely. Trade-off: every listing lands under ".../Other" rather than a more
      // specific, more discoverable subcategory -- correct/complete over ideal, revisit later.
      await clickDismissingCropModal(
        page,
        page.locator(".listing-editor__category-container").getByText("Other", { exact: true }).first()
      );
      // The selection itself needs a moment to actually commit in Poshmark's own Vue state -- the
      // force-close click below was firing immediately after and a real job still showed the
      // "Select Category" placeholder afterward, meaning it interrupted the selection before it
      // landed rather than just closing an already-committed dropdown.
      await page.waitForTimeout(500);
      // This dropdown's own menu doesn't reliably close itself after a selection either -- a
      // leftover <li> from it was separately seen intercepting clicks on the condition dropdown
      // right below. Clicking a neutral, always-present target (the page's own heading, never
      // covered by anything) forces it closed via the same "click outside" handler a real user
      // clicking elsewhere on the page would trigger.
      await page.locator('h1:has-text("Create Listing")').first().click();
      await page.waitForTimeout(200);
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
      // Confirmed live: "Next" doesn't actually submit the listing -- it advances to a second
      // "Share Listing" step (promote to Pinterest/Facebook/a Posh Party) with its own "List
      // This Item" button, which is the real, final submit. Critically, the URL does NOT change
      // on the "Next" transition at all (confirmed directly), so the generic success check this
      // runner falls back to afterward (page.url() !== the create-listing URL) would always have
      // read this as a failure even on a real success -- this second click is what actually
      // produces the URL change ("Next" stays on /create-listing, "List This Item" redirects to
      // the seller's own closet page) that check needs to correctly detect success.
      const listItemButton = page.locator('button:has-text("List This Item")');
      if (await listItemButton.isVisible({ timeout: 8000 }).catch(() => false)) {
        // A real job's debug screenshot showed this button rendered but the modal still fetching
        // its social-connection status (a "Connecting..." spinner) at the moment of the click --
        // the click landed on it while it was still inert and nothing submitted. isVisible() alone
        // doesn't catch that, and there's no reliable selector for the spinner to wait out
        // directly, so this retries the click a few times against the one signal that actually
        // means the submit landed: the URL leaving /create-listing.
        const createListingUrl = page.url();
        for (let attempt = 0; attempt < 3 && page.url() === createListingUrl; attempt++) {
          await listItemButton.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(2000 + attempt * 1500);
        }
      }
      // KNOWN LIMITATION, not yet resolved: the post-submit redirect lands on the seller's own
      // closet page (poshmark.com/closet/<username>), not the new listing's own permalink -- so
      // the externalUrl/externalId this run captures (create-adapter.ts's post(), generically,
      // from whatever URL the page ends on) identifies the seller, not this specific listing.
      // Every listing from the same account would collide on that id. Delist/updatePrice below
      // navigate by externalId to find the listing to act on -- until this is fixed, expect them
      // not to reliably target the right one. Needs finding the real per-listing URL (e.g. on the
      // closet page once the new listing appears there, which showed a real indexing delay in
      // testing) before delist/reprice for Poshmark can be trusted.
    },
  },
];

export const poshmarkAdapter = createManualAdapter({
  id: "poshmark",
  name: "Poshmark",
  // Retired 2026-09-23: a real, session-connected account got flagged by Poshmark's own bot
  // detection this week -- proof that session-connect alone (no password on our site) doesn't
  // make ongoing server-side automation safe, since posting and the daily health-check both
  // still ran headless from a datacenter IP either way. See ManualAdapterConfig.automationRetired.
  automationRetired: {
    reason: "a connected account was flagged by Poshmark's bot detection despite using session-connect; posting now happens live through your own browser via the extension.",
  },
  loginUrl: "https://poshmark.com/login",
  listingUrl: "https://poshmark.com/create-listing",
  usernameSelector: "input[name=\"login_form[username_email]\"]",
  passwordSelector: "input[name=\"login_form[password]\"]",
  submitSelector: "button[type=\"submit\"]",
  preSubmitSteps: poshmarkListingSteps,
  // Runs at publish time, before any browser automation, so the user finds out "Poshmark needs
  // to know who this is for" immediately in the publish UI -- not minutes later as a job failure
  // after a real browser already spent time on it. Same check the listing wizard runs live,
  // client-side, via poshmark-validation.ts -- this is the server-side backstop for listings
  // published without ever passing through that wizard (retries, CSV imports, the public API).
  validateListing: checkPoshmarkListing,
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
