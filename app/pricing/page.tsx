import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan, getPlan, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingGrid } from "./pricing-grid";
import { ComparisonTable } from "./comparison-table";
import { EnterpriseContact } from "./enterprise-contact";
import { PricingFaq } from "./pricing-faq";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let currentPlanId = getPlan(null).id;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: PLAN_ASSIGNMENT_SELECT,
    });
    currentPlanId = getEffectivePlan(user).id;
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
