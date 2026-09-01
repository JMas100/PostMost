import { NextRequest, NextResponse } from "next/server";
import { getStripe, getPlanIdFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function upsertSubscription(subscription: Stripe.Subscription, eventCreatedAt: Date) {
  const customerId = subscription.customer as string;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  // Stripe delivers webhook events out of order and retries them, so an older event can arrive
  // after a newer one already applied -- ignore it rather than clobbering current state with
  // stale data (e.g. re-downgrading a user whose subsequent upgrade already landed).
  if (user.stripeEventCreatedAt && eventCreatedAt <= user.stripeEventCreatedAt) return;

  const status = subscription.status;
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const planId = priceId ? getPlanIdFromPriceId(priceId) : null;

  const isActive = status === "active" || status === "trialing";
  const newPlan = isActive ? planId ?? "free" : "free";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: newPlan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: status,
      stripeEventCreatedAt: eventCreatedAt,
    },
  });

  if (user.plan !== newPlan) {
    await logAudit(
      { workspaceUserId: user.id, actingUserId: user.id },
      { action: "billing.plan_changed", message: `Plan changed to ${newPlan} (Stripe subscription ${status})` }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const eventCreatedAt = new Date(event.created * 1000);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
        await upsertSubscription(subscription, eventCreatedAt);
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(subscription, eventCreatedAt);
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
