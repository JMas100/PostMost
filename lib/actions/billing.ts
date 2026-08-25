"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectivePlan, PlanId, PLANS } from "@/lib/plans";
import { getStripePriceId, getStripe } from "@/lib/stripe";

// Deliberately local and null-returning, unlike the shared throwing getUserId in
// lib/auth-helpers.ts -- billing reads (getBilling, etc.) need to render a signed-out state
// gracefully rather than reject, which the shared helper's throw-on-missing-session contract
// doesn't fit.
function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) return null;
  return session.user.id;
}

export async function getBilling() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { usage: true },
  });
  if (!user) return null;

  const plan = getEffectivePlan(user);
  return {
    plan,
    usage: user.usage,
    stripeCustomerId: user.stripeCustomerId,
    subscriptionStatus: user.subscriptionStatus,
  };
}

export async function createCheckoutSession(formData: FormData) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const planId = formData.get("plan") as PlanId;
  const interval = (formData.get("interval") as "month" | "year") || "month";
  if (!PLANS.some((p) => p.id === planId)) {
    return { error: "Invalid plan" };
  }
  if (planId === "enterprise") {
    return { error: "Enterprise plan requires a custom sales conversation" };
  }
  if (interval !== "month" && interval !== "year") {
    return { error: "Invalid billing interval" };
  }
  const priceId = getStripePriceId(planId, interval);
  if (!priceId) {
    return { error: "Stripe price not configured for this plan and interval" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      metadata: { userId, planId },
      subscription_data: { metadata: { userId, planId } },
    });

    return { url: checkoutSession.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return { error: message };
  }
}

export async function createBillingPortalSession() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) return { error: "No billing account" };

  try {
    const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/settings/billing`,
    });

    return { url: portalSession.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't open the billing portal";
    return { error: message };
  }
}

export async function updatePlan(formData: FormData) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return;

  const planId = formData.get("plan") as PlanId;
  if (!PLANS.some((p) => p.id === planId)) return;

  if (planId === "free") {
    await prisma.user.update({ where: { id: userId }, data: { plan: "free" } });
    revalidatePath("/settings/billing");
    revalidatePath("/pricing");
    return;
  }

  // Paid plans are handled by Stripe checkout.
  revalidatePath("/settings/billing");
}
