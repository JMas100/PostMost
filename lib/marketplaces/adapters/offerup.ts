import { createManualAdapter } from "../automation/create-adapter";

// Real DOM dump (2026-09-21, via the account owner manually clicking through their own browser --
// never drive Playwright directly against a live OfferUp session, see the same hard rule that
// applies to Poshmark). `loginUrl` does NOT land on a plain email/password form -- it's a 3-step
// MUI dialog:
//   1. Provider selection ("Continue with Facebook/Google/Apple/email")
//   2. A "Sign up" / "Log in" tab choice
//   3. The actual email/password form.
// The original selectors (`input[type="email"]`) never matched anything on step 1 -- that field
// simply doesn't exist until "Continue with email" is clicked. This is the real, previously-
// unexplained cause of the "email field timeout" seen in an earlier live cross-post attempt (see
// project memory): not a wrong selector on the right page, but the right selector on a page that
// hadn't been reached yet.
const preLoginSteps = [
  {
    name: "click-continue-with-email",
    action: async (page: import("playwright-core").Page) => {
      await page.locator('button[aria-label="Continue with email"]').click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "click-log-in-tab",
    action: async (page: import("playwright-core").Page) => {
      // Scoped to this step's own dialog testid -- "Log in" also appears as the next step's
      // dialog title (an <h1>, not a button), so an unscoped text selector would still be
      // unambiguous here, but this is cheap insurance against that changing.
      await page.locator('[data-testid="AuthDialogEmailSelection"] button:has-text("Log in")').click();
      await page.waitForTimeout(300);
    },
  },
];

// KNOWN OPEN QUESTION, not yet resolved: this same dialog states "This site is protected by
// reCAPTCHA" (confirmed live in the DOM dump above) -- the same category of protection that made
// Mercari's password-based login automation a permanent dead end via Cloudflare Bot Management
// (see project memory). Unlike Mercari's confirmed 403, it's not yet known whether this actually
// blocks a real headless submit here (reCAPTCHA v3-style checks are sometimes passive/invisible
// and only trigger on suspicious signals) -- that's only answerable by actually attempting a real
// connect against a real account and seeing what verifyLogin reports back.
export const offerupAdapter = createManualAdapter({
  id: "offerup",
  name: "OfferUp",
  loginUrl: "https://offerup.com/login/",
  listingUrl: "https://offerup.com/item/new/",
  preLoginSteps,
  usernameSelector: "#auth-login-dialog-email-field",
  passwordSelector: "#auth-login-dialog-password-field",
  submitSelector: 'button[data-testid="AuthDialogSubmitButton"]',
  delete: {
    openMenuSelectors: [
      "[aria-label='More options']",
      "button:has-text('...')",
    ],
    deleteSelectors: [
      "text=Delete Listing",
      "button:has-text('Delete')",
      "a:has-text('Delete')",
    ],
    confirmSelectors: [
      "button:has-text('Delete')",
      "button:has-text('Yes')",
      "button:has-text('Confirm')",
    ],
  },
  // Same caveat as delete: best-effort, unverified against a live account.
  reprice: {
    editTriggerSelectors: [
      "a:has-text('Edit')",
      "button:has-text('Edit')",
    ],
    priceSelectors: [
      "input[name=\"price\"]",
      "input[id*=\"price\" i]",
      "input[placeholder*=\"price\" i]",
    ],
    saveSelectors: [
      "button:has-text('Save')",
      "button:has-text('Post')",
      "button[type=\"submit\"]",
    ],
  },
});
