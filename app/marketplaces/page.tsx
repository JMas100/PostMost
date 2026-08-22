import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function MarketplacesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplaces</h1>
          <p className="text-muted-foreground">Connect and manage the platforms you sell on.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Marketplace management is on the roadmap. For now, connect accounts in Settings.
            </p>
            <Link href="/settings" className={buttonVariants({ variant: "default" })}>
              Go to Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
