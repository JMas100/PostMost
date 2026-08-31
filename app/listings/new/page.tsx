import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { ListingForm } from "@/components/listing-form";
import { getTemplates } from "@/lib/actions/templates";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { trackListingStarted } from "@/lib/actions/analytics";
import { TrackOnMount } from "@/components/track-on-mount";
import { PageHeader } from "@/components/page-header";

export default async function NewListingPage(props: { searchParams?: Promise<{ templateId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const templates = await getTemplates();
  const shippingProfiles = await getShippingProfiles();
  const accounts = await getMarketplaceAccounts();

  return (
    <Shell>
      <TrackOnMount action={trackListingStarted} />
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Create listing" description="Fill it in once. We format it for every marketplace on publish." />
        <ListingForm templates={templates} defaultTemplateId={searchParams?.templateId} shippingProfiles={shippingProfiles} accounts={accounts} />
      </div>
    </Shell>
  );
}
