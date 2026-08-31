import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getTemplates } from "@/lib/actions/templates";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { TemplatesList } from "./templates-list";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [templates, shippingProfiles] = await Promise.all([getTemplates(), getShippingProfiles()]);

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Templates"
          description="Reusable starting points. Pick one in the composer and it fills the fields it holds."
          actions={
            <Link href="/listings/new" className={buttonVariants()}>
              New template
            </Link>
          }
        />
        <TemplatesList templates={templates} shippingProfiles={shippingProfiles} />
      </div>
    </Shell>
  );
}
