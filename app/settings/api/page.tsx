import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKeys } from "@/lib/actions/api-keys";
import { ApiClient } from "./api-client";
import { PageHeader } from "@/components/page-header";

export default async function ApiSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const keys = await getApiKeys();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="API & integrations" description="Create API keys to import listings programmatically." />
      <ApiClient keys={keys} />
    </div>
  );
}
