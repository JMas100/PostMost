import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { ShippingClient } from "./shipping-client";
import { PageHeader } from "@/components/page-header";

export default async function ShippingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const profiles = await getShippingProfiles();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Shipping profiles" />
      <ShippingClient profiles={profiles} />
    </div>
  );
}
