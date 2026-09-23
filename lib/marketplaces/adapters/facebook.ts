import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Facebook
// Marketplace's UI — not verified against a live account. Needs real-account testing before
// it's trusted.
export const facebookAdapter = createManualAdapter({
  id: "facebook",
  name: "Facebook Marketplace",
  // Retired 2026-09-23, same account-safety pass as every other manual adapter here -- see
  // ManualAdapterConfig.automationRetired.
  automationRetired: {
    reason: "unattended server-side automation carries the same bot-detection risk that just got a real Poshmark account flagged; posting now happens live through your own browser via the extension.",
  },
  loginUrl: "https://www.facebook.com/login",
  listingUrl: "https://www.facebook.com/marketplace/create/item/",
  usernameSelector: "input[name=\"email\"]",
  passwordSelector: "input[name=\"pass\"]",
  submitSelector: "button[name=\"login\"]",
  successUrlFragment: "marketplace",
  delete: {
    openMenuSelectors: [
      "[aria-label='More']",
      "[aria-label='Manage listing']",
      "div[aria-label='Actions']",
    ],
    deleteSelectors: [
      "text=Delete listing",
      "div[role='menuitem']:has-text('Delete')",
      "button:has-text('Delete listing')",
    ],
    confirmSelectors: [
      "div[aria-label='Delete']",
      "button:has-text('Delete')",
      "button:has-text('Confirm')",
    ],
  },
  // Same caveat as delete: best-effort, unverified against a live account.
  reprice: {
    editTriggerSelectors: [
      "[aria-label='Edit listing']",
      "div[aria-label='Actions']",
      "text=Edit listing",
    ],
    priceSelectors: [
      "input[name=\"price\"]",
      "input[aria-label='Price']",
      "input[id*=\"price\" i]",
    ],
    saveSelectors: [
      "div[aria-label='Save']",
      "button:has-text('Save')",
      "button[type=\"submit\"]",
    ],
  },
});
