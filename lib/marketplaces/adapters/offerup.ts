import { createManualAdapter } from "../automation/create-adapter";

export const offerupAdapter = createManualAdapter({
  id: "offerup",
  name: "OfferUp",
  loginUrl: "https://offerup.com/login/",
  listingUrl: "https://offerup.com/item/new/",
  usernameSelector: "input[type=\"email\"]",
  passwordSelector: "input[type=\"password\"]",
  submitSelector: "button[type=\"submit\"]",
});
