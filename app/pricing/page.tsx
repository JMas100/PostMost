import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatPrice, getPlan, Plan } from "@/lib/plans";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";

function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <p className="text-sm text-gray-500">{plan.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</span>
        <span className="text-gray-500">/mo</span>
      </div>
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <Button disabled className="w-full">
          Current plan
        </Button>
      ) : (
        <Link
          href="/settings/billing"
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
        >
          Choose {plan.name}
        </Link>
      )}
    </div>
  );
}

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let currentPlan = getPlan(null);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    currentPlan = getPlan(user?.plan);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-gray-600">Pick a plan that fits your resale business.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan.id} />
        ))}
      </div>
    </main>
  );
}
