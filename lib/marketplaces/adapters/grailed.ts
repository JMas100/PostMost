import { createManualAdapter } from "../automation/create-adapter";

export const grailedAdapter = createManualAdapter({
  id: "grailed",
  name: "Grailed",
  loginUrl: "https://www.grailed.com/users/sign_in",
  listingUrl: "https://www.grailed.com/sell/new",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
});
