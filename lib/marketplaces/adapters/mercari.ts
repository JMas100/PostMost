import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Mercari's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const mercariAdapter = createManualAdapter({
  id: "mercari",
  name: "Mercari",
  loginUrl: "https://www.mercari.com/us/login/",
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
});
