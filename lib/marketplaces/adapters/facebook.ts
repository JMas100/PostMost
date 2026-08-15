import { createManualAdapter } from "../automation/create-adapter";

export const facebookAdapter = createManualAdapter({
  id: "facebook",
  name: "Facebook Marketplace",
  loginUrl: "https://www.facebook.com/login",
  listingUrl: "https://www.facebook.com/marketplace/create/item/",
  usernameSelector: "input[name=\"email\"]",
  passwordSelector: "input[name=\"pass\"]",
  submitSelector: "button[name=\"login\"]",
  successUrlFragment: "marketplace",
});
