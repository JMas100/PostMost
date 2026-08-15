import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { CsvImporter } from "./csv-importer";

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bulk import</h1>
          <p className="text-muted-foreground">Upload a CSV to create listings in bulk.</p>
        </div>
        <CsvImporter />
      </div>
    </Shell>
  );
}
