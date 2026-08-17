import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import { PricingGrid } from "./pricing-grid";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let currentPlanId = getPlan(null).id;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    currentPlanId = getPlan(user?.plan).id;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Grow into your plan.</h1>
        <p className="text-muted-foreground">Start free. Upgrade when PostMost becomes part of your business.</p>
      </div>
      <PricingGrid currentPlanId={currentPlanId} />
    </main>
  );
}
