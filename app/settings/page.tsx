import { redirect } from "next/navigation";

// Marketplace connections moved to their own page (built for them, and where the activation
// checklist already points) -- the settings root becomes the account page it should have been.
export default function SettingsPage() {
  redirect("/settings/account");
}
