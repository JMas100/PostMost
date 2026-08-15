import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { ListingForm } from "@/components/listing-form";
import { getTemplates } from "@/lib/actions/templates";

export default async function NewListingPage({ searchParams }: { searchParams?: { templateId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const templates = await getTemplates();

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Create listing</h1>
        <ListingForm templates={templates} defaultTemplateId={searchParams?.templateId} />
      </div>
    </Shell>
  );
}
