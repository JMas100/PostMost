import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { getAdapter } from "@/lib/marketplaces";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId: session.user.id },
  });

  const connected = new Set(accounts.map((a) => a.platform));

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Connected marketplaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLATFORMS.map((platform) => {
                const adapter = getAdapter(platform.id);
                const isConnected = connected.has(platform.id);
                return (
                  <div key={platform.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: platform.color }} />
                      <div>
                        <p className="font-medium">{platform.name}</p>
                        <p className="text-xs text-muted-foreground">{adapter?.authType === "oauth" ? "OAuth" : "Manual / Automation"}</p>
                      </div>
                    </div>
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Account connection UI will be added here. For now, accounts can be seeded or created via the database.
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
