import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, meetsMinimumTier } from "@/lib/plans";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CsvImporter } from "./csv-importer";

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const plan = getPlan(user?.plan);
  const allowed = meetsMinimumTier(plan.id, "grow");

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bulk import</h1>
          <p className="text-muted-foreground">Upload a CSV to create listings in bulk.</p>
        </div>
        {allowed ? (
          <CsvImporter />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upgrade to import CSVs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The {plan.name} plan doesn&apos;t include CSV import. Upgrade to Grow or higher to
                unlock it.
              </p>
              <Link href="/pricing" className={buttonVariants({ variant: "default" })}>
                View plans
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
