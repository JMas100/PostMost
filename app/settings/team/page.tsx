import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const name = session.user.name || session.user.email || "Account owner";
  const initial = (session.user.name || session.user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Team" />

      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initial}
            </div>
            <div>
              <p className="font-medium">{name}</p>
              {session.user.email && <p className="text-sm text-muted-foreground">{session.user.email}</p>}
            </div>
          </div>
          <Badge variant="outline">Owner</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team seats aren&apos;t live yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inviting someone today wouldn&apos;t let them sign in, so shared team access is on the roadmap. For
            now, each PostMost account is single-user — invited teammates can&apos;t yet sign in or see your
            listings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
