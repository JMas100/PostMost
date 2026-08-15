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

export function getStripePriceId(planId: string): string | undefined {
  const map: Record<string, string | undefined> = {
    launch: process.env.STRIPE_PRICE_LAUNCH,
    grow: process.env.STRIPE_PRICE_GROW,
    pro: process.env.STRIPE_PRICE_PRO,
    scale: process.env.STRIPE_PRICE_SCALE,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[planId];
}

export function getPlanIdFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_LAUNCH) map[process.env.STRIPE_PRICE_LAUNCH] = "launch";
  if (process.env.STRIPE_PRICE_GROW) map[process.env.STRIPE_PRICE_GROW] = "grow";
  if (process.env.STRIPE_PRICE_PRO) map[process.env.STRIPE_PRICE_PRO] = "pro";
  if (process.env.STRIPE_PRICE_SCALE) map[process.env.STRIPE_PRICE_SCALE] = "scale";
  if (process.env.STRIPE_PRICE_ENTERPRISE) map[process.env.STRIPE_PRICE_ENTERPRISE] = "enterprise";
  return map[priceId] || null;
}
