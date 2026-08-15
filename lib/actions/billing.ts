"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlanId, PLANS } from "@/lib/plans";
import { getStripePriceId, getStripe } from "@/lib/stripe";

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

  const plan = PLANS.find((p) => p.id === user.plan) ?? PLANS[0];
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
  if (!PLANS.some((p) => p.id === planId)) {
    return { error: "Invalid plan" };
  }
  const priceId = getStripePriceId(planId);
  if (!priceId) {
    return { error: "Stripe price not configured for this plan" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

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
}

export async function createBillingPortalSession() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) return { error: "No billing account" };

  const origin = process.env.NEXTAUTH_URL || "https://postmost.co";
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return { url: portalSession.url };
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
