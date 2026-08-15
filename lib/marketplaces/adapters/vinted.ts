import { createManualAdapter } from "../automation/create-adapter";

export const vintedAdapter = createManualAdapter({
  id: "vinted",
  name: "Vinted",
  loginUrl: "https://www.vinted.com/login",
  listingUrl: "https://www.vinted.com/items/new",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
});
