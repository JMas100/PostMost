import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default function TeamSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Team" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Shared team access is on the roadmap. For now, each PostMost account is single-user —
            invited teammates can&apos;t yet sign in or see your listings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
