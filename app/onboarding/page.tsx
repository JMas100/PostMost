import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getActivationState } from "@/lib/actions/activation";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [activationState, accounts] = await Promise.all([
    getActivationState(session.user.id),
    getMarketplaceAccounts(),
  ]);

  const step = !activationState.connectedAny ? 1 : !activationState.publishedFirst ? 2 : 3;

  return <OnboardingWizard step={step} accounts={accounts} />;
}
