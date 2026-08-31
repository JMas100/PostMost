import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Facebook
// Marketplace's UI — not verified against a live account. Needs real-account testing before
// it's trusted.
export const facebookAdapter = createManualAdapter({
  id: "facebook",
  name: "Facebook Marketplace",
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
