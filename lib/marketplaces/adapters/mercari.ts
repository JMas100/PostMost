import { createManualAdapter } from "../automation/create-adapter";

// Tested against a real account (2026-08-26): the login form/field selectors below are correct
// (loginUrl was previously wrong -- "/us/login/" 404s, the real path is "/login/", fixed here),
// but Mercari's login is behind reCAPTCHA Enterprise and rejects the automated submission
// outright with a 403 -- this isn't a selector problem, no amount of selector tweaking gets past
// it. Password-based automation is unlikely to ever work reliably for this platform; the
// browser-session connect mechanism built for Poshmark (see app/api/extension/session/route.ts)
// is the real fix, since the user's own browser passes the CAPTCHA naturally. Delete-flow
// selectors below remain unverified against a live account -- couldn't get past login to check.
export const mercariAdapter = createManualAdapter({
  id: "mercari",
  name: "Mercari",
  loginUrl: "https://www.mercari.com/login/",
  listingUrl: "https://www.mercari.com/sell/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
  delete: {
    openMenuSelectors: [
      "[aria-label='More options']",
      "[aria-label='menu']",
      "button:has-text('...')",
    ],
    deleteSelectors: [
      "text=Delete listing",
      "button:has-text('Delete')",
      "a:has-text('Delete')",
    ],
    confirmSelectors: [
      "button:has-text('Delete')",
      "button:has-text('Yes')",
      "button:has-text('Confirm')",
    ],
  },
  // Same caveat as delete: best-effort, unverified against a live account. Mercari's login is
  // reCAPTCHA-blocked for password automation regardless (see the note above), so this path only
  // matters once an account is connected via browser-session connect.
  reprice: {
    editTriggerSelectors: [
      "a:has-text('Edit')",
      "button:has-text('Edit')",
      "[aria-label='Edit listing']",
    ],
    priceSelectors: [
      "input[name=\"price\"]",
      "input[id*=\"price\" i]",
      "input[placeholder*=\"price\" i]",
    ],
    saveSelectors: [
      "button:has-text('Update')",
      "button:has-text('Save')",
      "button[type=\"submit\"]",
    ],
  },
});
