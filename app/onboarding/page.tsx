import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import { getActivationState } from "@/lib/actions/activation";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId } = await requireWorkspace();

  const activationState = await getActivationState(workspaceUserId);

  // Step 3 used to be a static "you're all set" screen -- claiming success without checking it,
  // exactly the gap the design audit flagged in the wizard's old onboarding finish. The real
  // per-marketplace payoff (live status, honest "N of M" headline, working links, retry) already
  // exists on the listing detail page as of this session's Publish Payoff work, so once the first
  // listing is published this step sends the user straight there instead of duplicating a
  // second, less honest version of the same moment.
  if (activationState.publishedFirst) {
    const listing = await prisma.listing.findFirst({
      where: { userId: workspaceUserId, isDraft: false },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (listing) redirect(`/listings/${listing.id}`);
    redirect("/dashboard");
  }

  const accounts = await getMarketplaceAccounts();
  const step = !activationState.connectedAny ? 1 : 2;

  return <OnboardingWizard step={step} accounts={accounts} />;
}
