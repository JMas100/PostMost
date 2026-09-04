import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getTemplate } from "@/lib/actions/templates";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { TemplateEditForm } from "@/components/template-edit-form";
import { PageHeader } from "@/components/page-header";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const [template, shippingProfiles] = await Promise.all([getTemplate(id), getShippingProfiles()]);
  if (!template) notFound();

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title={`Edit "${template.name}"`} description="Changes apply the next time this template is used." />
        <TemplateEditForm
          template={{ id: template.id, name: template.name, payload: template.payload, platforms: template.platforms }}
          shippingProfiles={shippingProfiles.map((p) => ({ id: p.id, name: p.name }))}
          platforms={PLATFORMS.filter((p) => p.authType !== "none").map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </Shell>
  );
}
