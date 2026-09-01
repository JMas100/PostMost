"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, WorkspaceContext } from "@/lib/auth-helpers";
import { getEffectivePlan, PlanId, PLANS } from "@/lib/plans";
import { getStripePriceId, getStripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";

// Billing is never resolved through the shared workspace, and is owner-only -- not even ADMIN.
// requireWorkspace() still throws for a signed-out visitor, which every function here needs to
// handle gracefully (a null/error return, not a crash), so each call site wraps it instead of
// using the shared helper directly.
async function requireOwnerContext(): Promise<WorkspaceContext | null> {
  try {
    const ctx = await requireWorkspace();
    return ctx.role === "OWNER" ? ctx : null;
  } catch {
    return null;
  }
}

export async function getBilling() {
  const ctx = await requireOwnerContext();
  if (!ctx) return null;

  const user = await prisma.user.findUnique({
    where: { id: ctx.actingUserId },
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
  const ctx = await requireOwnerContext();
  if (!ctx) {
    return { error: "Only the workspace owner can manage billing." };
  }
  const userId = ctx.actingUserId;

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
  const ctx = await requireOwnerContext();
  if (!ctx) return { error: "Only the workspace owner can manage billing." };
  const userId = ctx.actingUserId;

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
  const ctx = await requireOwnerContext();
  if (!ctx) return;
  const userId = ctx.actingUserId;

  const planId = formData.get("plan") as PlanId;
  if (!PLANS.some((p) => p.id === planId)) return;

  if (planId === "free") {
    await prisma.user.update({ where: { id: userId }, data: { plan: "free" } });
    await logAudit({ workspaceUserId: userId, actingUserId: userId }, { action: "billing.plan_changed", message: "Downgraded to the Free plan" });
    revalidatePath("/settings/billing");
    revalidatePath("/pricing");
    return;
  }

  // Paid plans are handled by Stripe checkout.
  revalidatePath("/settings/billing");
}
