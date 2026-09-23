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
    // Best-effort, not confirmed against a real DOM dump -- the account owner's own manual
    // click-through (the source for every other selector in this file) came from a browser
    // that already had cookies accepted, so a fresh-context consent banner (which this
    // automation always hits, starting from zero every run) would never have shown up there.
    // Real evidence this is worth having: a live verifyLogin run timed out waiting for the
    // very next step's dialog to render at all, the same failure mode Poshmark's own
    // `.cookie-banner` caused before it was dismissed up front. No-op if it's not there.
    name: "dismiss-cookie-banner",
    action: async (page: import("playwright-core").Page) => {
      const candidates = [
        "#onetrust-accept-btn-handler",
        'button:has-text("Accept All")',
        'button:has-text("Accept Cookies")',
        'button:has-text("Accept all cookies")',
        'button:has-text("I Accept")',
        'button:has-text("Accept")',
      ];
      for (const sel of candidates) {
        const loc = page.locator(sel).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          await loc.click().catch(() => {});
          await page.waitForTimeout(300);
          break;
        }
      }
    },
  },
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
      // A real verify-login screenshot (2026-09-22) confirmed this step correctly reaches the
      // right dialog (title "Sign up / Log in", only "Sign up"/"Log in" buttons visible) but
      // then times out -- the data-testid="AuthDialogEmailSelection" scope this used to have no
      // longer matches anything live, even though the visible "Log in" button is right there.
      // Internal test ids are exactly the kind of implementation detail that drifts across a
      // site's own deploys without the visible UI changing at all. Scoped to role="dialog"
      // instead -- a standard ARIA attribute, far less likely to be renamed -- rather than an
      // unscoped `button:has-text("Log in")`, since "Log in" also appears as the *next* step's
      // dialog title (an <h1>, not a button, so still technically unambiguous either way, but
      // this keeps some real scoping rather than none).
      await page.locator('[role="dialog"] button:has-text("Log in")').click();
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
  // Retired 2026-09-23, same account-safety pass as every other manual adapter here -- see
  // ManualAdapterConfig.automationRetired. This one's real login-verify work (the preLoginSteps
  // above, the stale-testid fix) stays in place, inert, rather than being deleted, in case
  // server automation is ever safe enough to reconsider.
  automationRetired: {
    reason: "unattended server-side automation carries the same bot-detection risk that just got a real Poshmark account flagged; posting now happens live through your own browser via the extension.",
  },
  loginUrl: "https://offerup.com/login/",
  listingUrl: "https://offerup.com/item/new/",
  preLoginSteps,
  usernameSelector: "#auth-login-dialog-email-field",
  passwordSelector: "#auth-login-dialog-password-field",
  // Combined with a text fallback (the real button copy from the original DOM dump, "Agree &
  // Log in") since the same kind of internal-testid drift just broke the "Log in" tab click
  // above -- this exact testid hasn't failed yet, but it's the same fragile pattern, and a
  // comma-separated CSS selector costs nothing if the testid is still there.
  submitSelector: 'button[data-testid="AuthDialogSubmitButton"], button:has-text("Agree & Log in")',
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
