import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { SettingsNav } from "./settings-nav";

// connectMarketplaceAccount's credential check launches a real headless browser and waits on a
// live login page -- comfortably longer than the platform's default Server Action timeout.
export const maxDuration = 60;

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <Shell>
      <div className="space-y-6">
        <SettingsNav />
        {children}
      </div>
    </Shell>
  );
}
