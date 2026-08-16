import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getTeam } from "@/lib/actions/team";
import { TeamClient } from "./team-client";

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const team = await getTeam();
  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Team</h1>
        <TeamClient team={team} />
      </div>
    </Shell>
  );
}
