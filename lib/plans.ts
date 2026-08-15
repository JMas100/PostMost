export type PlanId = "free" | "starter" | "growth" | "pro" | "enterprise";

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
      "5 new listings per month",
      "5 AI photo analyses per month",
      "Post to 3 marketplaces at once",
      "Basic analytics",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 999,
    description: "For casual resellers starting to scale.",
    listingsPerMonth: 50,
    aiCreditsPerMonth: 50,
    marketplaces: 8,
    features: [
      "50 new listings per month",
      "50 AI photo analyses per month",
      "Post to 8 marketplaces at once",
      "Drafts & templates",
      "CSV bulk import",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 1999,
    description: "For part-time sellers ready to automate.",
    listingsPerMonth: 250,
    aiCreditsPerMonth: 200,
    marketplaces: 999,
    features: [
      "250 new listings per month",
      "200 AI photo analyses per month",
      "Unlimited marketplaces",
      "Auto-delisting on sale",
      "Sales analytics",
      "15 photos per listing",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 3999,
    description: "For serious sellers and small teams.",
    listingsPerMonth: 1000,
    aiCreditsPerMonth: 500,
    marketplaces: 999,
    features: [
      "1,000 new listings per month",
      "500 AI photo analyses per month",
      "Unlimited marketplaces",
      "Inventory sync webhooks",
      "1 team member",
      "Priority support",
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
