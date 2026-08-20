import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroBranch } from "@/components/marketing/hero-branch";
import { MarketplaceStrip } from "@/components/marketing/marketplace-strip";
import { ProblemCompare } from "@/components/marketing/problem-compare";
import { PublishDemo } from "@/components/marketing/publish-demo";
import { CreateSection } from "@/components/marketing/create-section";
import { AiAssistSection } from "@/components/marketing/ai-assist-section";
import { PublishRadial } from "@/components/marketing/publish-radial";
import { ManageDashboard } from "@/components/marketing/manage-dashboard";
import { AutomationFlow } from "@/components/marketing/automation-flow";
import { PartialFailure } from "@/components/marketing/partial-failure";
import { InfrastructureGrid } from "@/components/marketing/infrastructure-grid";
import { ScaleProgression } from "@/components/marketing/scale-progression";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function HomePage() {
  return (
    <div className="marketing-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />
      <HeroBranch />
      <MarketplaceStrip />
      <ProblemCompare />
      <PublishDemo />
      <CreateSection />
      <AiAssistSection />
      <PublishRadial />
      <ManageDashboard />
      <AutomationFlow />
      <PartialFailure />
      <InfrastructureGrid />
      <ScaleProgression />
      <PricingGrid />
      <FaqAccordion />
      <FinalCta />
      <MarketingFooter />
    </div>
  );
}
