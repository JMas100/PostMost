import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccount } from "@/lib/actions/account";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const account = await getAccount();
  if (!account) redirect("/login");

  return <AccountClient name={account.name ?? ""} email={account.email} />;
}
