export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  description: string;
  listingsPerMonth: number;
  aiCreditsPerMonth: number;
  marketplaces: number;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    description: "Try PostMost and cross-list a few items each month.",
    listingsPerMonth: 5,
    aiCreditsPerMonth: 5,
    marketplaces: 3,
    features: [
      "5 listings per month",
      "5 AI photo analyses per month",
      "Post to 3 marketplaces at once",
      "Basic analytics",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 999,
    description: "For casual resellers growing their side hustle.",
    listingsPerMonth: 100,
    aiCreditsPerMonth: 50,
    marketplaces: 8,
    features: [
      "100 listings per month",
      "50 AI photo analyses per month",
      "Post to 8 marketplaces at once",
      "Drafts & templates",
      "CSV bulk import",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 2999,
    description: "For serious sellers and small teams.",
    listingsPerMonth: 500,
    aiCreditsPerMonth: 250,
    marketplaces: 999,
    features: [
      "500 listings per month",
      "250 AI photo analyses per month",
      "Unlimited marketplaces",
      "Auto-delisting on sale",
      "Inventory sync webhooks",
      "Team members (coming soon)",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 9999,
    description: "For consignment shops and high-volume sellers.",
    listingsPerMonth: -1,
    aiCreditsPerMonth: -1,
    marketplaces: 999,
    features: [
      "Unlimited listings",
      "Unlimited AI photo analyses",
      "Custom integrations",
      "Dedicated support",
      "White-label options",
    ],
  },
];

export const PLAN_BY_ID: Record<PlanId, Plan> = PLANS.reduce((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {} as Record<PlanId, Plan>);

export function getPlan(id: string | null | undefined): Plan {
  return PLAN_BY_ID[(id as PlanId) ?? "free"] ?? PLAN_BY_ID.free;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
