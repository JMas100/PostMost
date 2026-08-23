import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { ShippingClient } from "./shipping-client";

export default async function ShippingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const profiles = await getShippingProfiles();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Shipping profiles</h1>
      <ShippingClient profiles={profiles} />
    </div>
  );
}
