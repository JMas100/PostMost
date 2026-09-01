import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";
import { getEffectivePlan, getPlan, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingGrid } from "./pricing-grid";
import { ComparisonTable } from "./comparison-table";
import { EnterpriseContact } from "./enterprise-contact";
import { PricingFaq } from "./pricing-faq";

export default async function PricingPage() {
  let currentPlanId = getPlan(null).id;
  try {
    // A signed-in team member sees the workspace owner's real plan here too -- billing is
    // shared, so "your current plan" means the workspace's, not whatever an empty personal
    // account would otherwise default to.
    const { workspaceUserId } = await requireWorkspace();
    const user = await prisma.user.findUnique({
      where: { id: workspaceUserId },
      select: PLAN_ASSIGNMENT_SELECT,
    });
    currentPlanId = getEffectivePlan(user).id;
  } catch {
    // Signed-out visitor -- keep the free-tier default.
  }

  return (
    <div className="marketing-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />
      <PricingGrid currentPlanId={currentPlanId} />
      <ComparisonTable />
      <EnterpriseContact />
      <PricingFaq />
      <FinalCta heading="Start on Free. Move up when it pays for itself." sub={null} />
      <MarketingFooter />
    </div>
  );
}
