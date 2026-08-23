import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accounts = await getMarketplaceAccounts();

  return <SettingsClient accounts={accounts} />;
}
