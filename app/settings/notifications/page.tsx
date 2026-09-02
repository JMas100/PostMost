import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPreferences } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NotificationPreferenceToggle } from "@/components/notification-preference-toggle";
import type { UpdatablePreferences } from "@/lib/actions/notifications";

interface Row {
  label: string;
  description: string;
  app: keyof UpdatablePreferences | "locked";
  email: keyof UpdatablePreferences;
}

const ROWS: Row[] = [
  { label: "An item sells", description: "And we delist it elsewhere", app: "soldApp", email: "soldEmail" },
  {
    label: "A cross-post needs something",
    description: "Missing field, rejected listing",
    app: "locked",
    email: "crossPostFailedEmail",
  },
  {
    label: "A marketplace signs you out",
    description: "Posting pauses until you're back",
    app: "locked",
    email: "marketplaceSignedOutEmail",
  },
  {
    label: "Automation ran",
    description: "Relists, price drops, stock sync",
    app: "automationRanApp",
    email: "automationRanEmail",
  },
  {
    label: "A cross-post succeeds",
    description: "One per listing, not per marketplace",
    app: "crossPostSucceededApp",
    email: "crossPostSucceededEmail",
  },
  {
    label: "You're near a plan limit",
    description: "At 80% and again at 100%",
    app: "nearPlanLimitApp",
    email: "nearPlanLimitEmail",
  },
];

export default async function NotificationsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const prefs = await getPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Notifications" description="In-app is always on for needs-you." />

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_56px_56px] items-center gap-3 border-b px-5 py-3">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Event</span>
            <span className="text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">App</span>
            <span className="text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">Email</span>
          </div>

          {ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_56px_56px] items-center gap-3 border-b px-5 py-3.5 last:border-b-0">
              <div>
                <div className="text-[13.5px]">{row.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{row.description}</div>
              </div>
              <div className="flex justify-center">
                {row.app === "locked" ? (
                  <Switch checked disabled />
                ) : (
                  <NotificationPreferenceToggle field={row.app} initialValue={prefs[row.app]} />
                )}
              </div>
              <div className="flex justify-center">
                <NotificationPreferenceToggle field={row.email} initialValue={prefs[row.email]} />
              </div>
            </div>
          ))}

          <div className="p-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3.5">
              <div>
                <div className="text-[13px]">Daily digest instead of individual emails</div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  One email at 8am covering yesterday. Sold and signed-out still send immediately.
                </div>
              </div>
              <NotificationPreferenceToggle field="digestMode" initialValue={prefs.digestMode} />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Two rows have their in-app toggle greyed on purpose: a failed cross-post and a signed-out marketplace
              can&apos;t be silenced in-app, because the app is the only place you can fix them. Everything else is
              yours to turn off.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
