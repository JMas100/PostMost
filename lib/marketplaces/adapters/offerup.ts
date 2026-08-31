import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of OfferUp's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const offerupAdapter = createManualAdapter({
  id: "offerup",
  name: "OfferUp",
  loginUrl: "https://offerup.com/login/",
  listingUrl: "https://offerup.com/item/new/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
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
