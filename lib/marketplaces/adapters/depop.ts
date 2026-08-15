import { createManualAdapter } from "../automation/create-adapter";

export const depopAdapter = createManualAdapter({
  id: "depop",
  name: "Depop",
  loginUrl: "https://www.depop.com/login/",
  listingUrl: "https://www.depop.com/products/create/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
});
