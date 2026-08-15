"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlanId, PLANS } from "@/lib/plans";

export async function getBilling() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
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
  };
}

export async function updatePlan(formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  const planId = formData.get("plan") as PlanId;
  if (!PLANS.some((p) => p.id === planId)) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan: planId },
  });

  revalidatePath("/settings/billing");
  revalidatePath("/pricing");
}
