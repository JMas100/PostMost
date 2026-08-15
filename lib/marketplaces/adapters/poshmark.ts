import { createManualAdapter } from "../automation/create-adapter";

export const poshmarkAdapter = createManualAdapter({
  id: "poshmark",
  name: "Poshmark",
  loginUrl: "https://poshmark.com/login",
  listingUrl: "https://poshmark.com/create-listing",
  usernameSelector: "input[name=\"login_form[username_email]\"]",
  passwordSelector: "input[name=\"login_form[password]\"]",
  submitSelector: "button[type=\"submit\"]",
});
