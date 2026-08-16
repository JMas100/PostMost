import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

export function getStripePriceId(
  planId: string,
  interval: "month" | "year" = "month"
): string | undefined {
  const map: Record<string, Record<string, string | undefined>> = {
    month: {
      launch: process.env.STRIPE_PRICE_LAUNCH,
      grow: process.env.STRIPE_PRICE_GROW,
      pro: process.env.STRIPE_PRICE_PRO,
      scale: process.env.STRIPE_PRICE_SCALE,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    },
    year: {
      launch: process.env.STRIPE_PRICE_LAUNCH_ANNUAL,
      grow: process.env.STRIPE_PRICE_GROW_ANNUAL,
      pro: process.env.STRIPE_PRICE_PRO_ANNUAL,
      scale: process.env.STRIPE_PRICE_SCALE_ANNUAL,
      enterprise: undefined,
    },
  };
  return map[interval]?.[planId];
}

export function getPlanIdFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_LAUNCH) map[process.env.STRIPE_PRICE_LAUNCH] = "launch";
  if (process.env.STRIPE_PRICE_LAUNCH_ANNUAL) map[process.env.STRIPE_PRICE_LAUNCH_ANNUAL] = "launch";
  if (process.env.STRIPE_PRICE_GROW) map[process.env.STRIPE_PRICE_GROW] = "grow";
  if (process.env.STRIPE_PRICE_GROW_ANNUAL) map[process.env.STRIPE_PRICE_GROW_ANNUAL] = "grow";
  if (process.env.STRIPE_PRICE_PRO) map[process.env.STRIPE_PRICE_PRO] = "pro";
  if (process.env.STRIPE_PRICE_PRO_ANNUAL) map[process.env.STRIPE_PRICE_PRO_ANNUAL] = "pro";
  if (process.env.STRIPE_PRICE_SCALE) map[process.env.STRIPE_PRICE_SCALE] = "scale";
  if (process.env.STRIPE_PRICE_SCALE_ANNUAL) map[process.env.STRIPE_PRICE_SCALE_ANNUAL] = "scale";
  if (process.env.STRIPE_PRICE_ENTERPRISE) map[process.env.STRIPE_PRICE_ENTERPRISE] = "enterprise";
  return map[priceId] || null;
}
