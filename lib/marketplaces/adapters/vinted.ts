import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Vinted's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const vintedAdapter = createManualAdapter({
  id: "vinted",
  name: "Vinted",
  loginUrl: "https://www.vinted.com/login",
  listingUrl: "https://www.vinted.com/items/new",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
  delete: {
    openMenuSelectors: [
      "[aria-label='More options']",
      "button:has-text('...')",
    ],
    deleteSelectors: [
      "text=Delete",
      "button:has-text('Delete')",
      "a:has-text('Delete')",
    ],
    confirmSelectors: [
      "button:has-text('Yes, delete')",
      "button:has-text('Delete')",
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
      "button:has-text('Update')",
      "button:has-text('Save')",
      "button[type=\"submit\"]",
    ],
  },
});
