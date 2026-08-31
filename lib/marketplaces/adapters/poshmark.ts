import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Poshmark's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const poshmarkAdapter = createManualAdapter({
  id: "poshmark",
  name: "Poshmark",
  loginUrl: "https://poshmark.com/login",
  listingUrl: "https://poshmark.com/create-listing",
  usernameSelector: "input[name=\"login_form[username_email]\"]",
  passwordSelector: "input[name=\"login_form[password]\"]",
  submitSelector: "button[type=\"submit\"]",
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
