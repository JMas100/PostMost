export type PlanId = "free" | "launch" | "grow" | "pro" | "scale" | "enterprise";

/** "standard" is the self-hosted default remover; "studio" is the metered premium provider. */
export type BgRemovalTier = "standard" | "studio";

export interface Plan {
  id: PlanId;
  /** Ordinal rank among plans, 0 (free) to 5 (enterprise) — for "is this plan at least X" checks. */
  tier: number;
  name: string;
  priceMonthly: number;
  description: string;
  listingsPerMonth: number;
  aiCreditsPerMonth: number;
  /** Standard (self-hosted BiRefNet) background removals; -1 is unlimited. */
  bgRemovalsPerMonth: number;
  /** Premium "studio quality" removals through the paid provider; -1 is unlimited. */
  studioBgRemovalsPerMonth: number;
  activeInventoryLimit: number;
  marketplaces: number;
  features: string[];
}

export interface PlanAssignment {
  plan: string | null;
  planOverride: string | null;
  planOverrideExpiresAt: Date | null;
}

export const PLAN_ASSIGNMENT_SELECT = {
  plan: true,
  planOverride: true,
  planOverrideExpiresAt: true,
} as const;

export const PLANS: Plan[] = [
  {
    id: "free",
    tier: 0,
    name: "Free",
    priceMonthly: 0,
    description: "For people trying it out.",
    listingsPerMonth: 25,
    aiCreditsPerMonth: 10,
    bgRemovalsPerMonth: 25,
    studioBgRemovalsPerMonth: 0,
    activeInventoryLimit: 50,
    marketplaces: 3,
    features: [
      "25 new listings per month",
      "50 active inventory items",
      "3 marketplaces",
      "10 AI credits per month",
      "25 background removals per month",
      "Basic crosslisting",
      "Listing templates",
      "Manual delist/relist",
      "Basic analytics",
      "Mobile app",
    ],
  },
  {
    id: "launch",
    tier: 1,
    name: "Launch",
    priceMonthly: 999,
    description: "For casual sellers.",
    listingsPerMonth: 100,
    aiCreditsPerMonth: 50,
    bgRemovalsPerMonth: -1,
    studioBgRemovalsPerMonth: 10,
    activeInventoryLimit: 500,
    marketplaces: 5,
    features: [
      "100 new listings per month",
      "500 active inventory items",
      "5 marketplaces",
      "50 AI credits per month",
      "Unlimited background removals",
      "10 studio-quality removals per month",
      "Unlimited crossposting of existing listings",
      "Inventory syncing",
      "Auto-delisting",
      "Sale detection",
      "Bulk editing",
      "Email support",
    ],
  },
  {
    id: "grow",
    tier: 2,
    name: "Grow",
    priceMonthly: 1999,
    description: "For active resellers.",
    listingsPerMonth: 300,
    aiCreditsPerMonth: 100,
    bgRemovalsPerMonth: -1,
    studioBgRemovalsPerMonth: 50,
    activeInventoryLimit: 2000,
    marketplaces: 999,
    features: [
      "300 new listings per month",
      "2,000 active inventory items",
      "10+ marketplaces",
      "100 AI credits per month",
      "AI listing generation",
      "AI title/description optimization",
      "AI pricing suggestions",
      "Unlimited background removals",
      "50 studio-quality removals per month",
      "CSV import/export",
      "Auto-relist",
      "Advanced analytics",
    ],
  },
  {
    id: "pro",
    tier: 3,
    name: "Pro",
    priceMonthly: 3499,
    description: "For serious resellers. Most popular.",
    listingsPerMonth: 750,
    aiCreditsPerMonth: 500,
    bgRemovalsPerMonth: -1,
    studioBgRemovalsPerMonth: 200,
    activeInventoryLimit: 5000,
    marketplaces: 999,
    features: [
      "750 new listings per month",
      "5,000 active inventory items",
      "All marketplaces",
      "500 AI credits per month",
      "Unlimited background removals",
      "200 studio-quality removals per month",
      "Marketplace-specific optimization",
      "Automated pricing",
      "Profit tracking",
      "Inventory forecasting",
      "Priority support",
    ],
  },
  {
    id: "scale",
    tier: 4,
    name: "Scale",
    priceMonthly: 5999,
    description: "For high-volume sellers & small businesses.",
    listingsPerMonth: 2000,
    aiCreditsPerMonth: 5000,
    bgRemovalsPerMonth: -1,
    studioBgRemovalsPerMonth: 1000,
    activeInventoryLimit: -1,
    marketplaces: 999,
    features: [
      "2,000 new listings per month",
      "Unlimited active inventory",
      "All marketplaces",
      "5,000 AI credits per month",
      "Unlimited background removals",
      "1,000 studio-quality removals per month",
      "3 team seats included",
      "Advanced automation",
      "CSV/API integrations",
      "Advanced reporting",
      "Inventory valuation",
      "Dedicated onboarding",
    ],
  },
  {
    id: "enterprise",
    tier: 5,
    name: "Enterprise",
    priceMonthly: 14900,
    description: "For warehouses & multi-user operations.",
    listingsPerMonth: -1,
    aiCreditsPerMonth: 10000,
    bgRemovalsPerMonth: -1,
    studioBgRemovalsPerMonth: -1,
    activeInventoryLimit: -1,
    marketplaces: 999,
    features: [
      "Unlimited listings",
      "Unlimited active inventory",
      "Unlimited marketplaces",
      "10,000 AI credits per month",
      "Unlimited background removals",
      "Unlimited studio-quality removals",
      "Unlimited users or negotiated seats",
      "API access & webhooks",
      "Custom integrations",
      "Dedicated account manager",
      "White-label options",
      "SLA",
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

export function getEffectivePlan(
  assignment: PlanAssignment | null | undefined,
  now = new Date()
): Plan {
  const override = assignment?.planOverride;
  const overrideIsActive =
    override &&
    Object.prototype.hasOwnProperty.call(PLAN_BY_ID, override) &&
    (!assignment.planOverrideExpiresAt || assignment.planOverrideExpiresAt > now);

  return getPlan(overrideIsActive ? override : assignment?.plan);
}

export function meetsMinimumTier(planId: string | null | undefined, minimumId: PlanId): boolean {
  return getPlan(planId).tier >= getPlan(minimumId).tier;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
