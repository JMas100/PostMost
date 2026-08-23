import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeys } from "@/lib/actions/api-keys";
import { ApiClient } from "./api-client";

export default async function ApiSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const keys = await getApiKeys();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API & integrations</h1>
        <p className="text-sm text-muted-foreground">Create API keys to import listings programmatically.</p>
      </div>
      <ApiClient keys={keys} />
    </div>
  );
}
