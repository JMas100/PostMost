import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPreferences } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/page-header";
import { NotificationPreferenceMatrix } from "@/components/notification-preference-matrix";

export default async function NotificationsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const prefs = await getPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Notifications" description="In-app is always on for needs-you." />
      <NotificationPreferenceMatrix prefs={prefs} />
    </div>
  );
}
