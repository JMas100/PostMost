import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Depop's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const depopAdapter = createManualAdapter({
  id: "depop",
  name: "Depop",
  loginUrl: "https://www.depop.com/login/",
  listingUrl: "https://www.depop.com/products/create/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
  delete: {
    deleteSelectors: [
      "button:has-text('Delete listing')",
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
