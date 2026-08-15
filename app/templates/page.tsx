import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getTemplates } from "@/lib/actions/templates";
import { TemplatesList } from "./templates-list";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const templates = await getTemplates();

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold">Templates</h1>
        <TemplatesList templates={templates} />
      </div>
    </Shell>
  );
}
