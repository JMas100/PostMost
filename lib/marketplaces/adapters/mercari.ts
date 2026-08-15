import { createManualAdapter } from "../automation/create-adapter";

export const mercariAdapter = createManualAdapter({
  id: "mercari",
  name: "Mercari",
  loginUrl: "https://www.mercari.com/us/login/",
  listingUrl: "https://www.mercari.com/sell/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
});
