import { createManualAdapter } from "../automation/create-adapter";

// Delete-flow selectors are best-effort, written from general knowledge of Grailed's UI —
// not verified against a live account. Needs real-account testing before it's trusted.
export const grailedAdapter = createManualAdapter({
  id: "grailed",
  name: "Grailed",
  loginUrl: "https://www.grailed.com/users/sign_in",
  listingUrl: "https://www.grailed.com/sell/new",
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
