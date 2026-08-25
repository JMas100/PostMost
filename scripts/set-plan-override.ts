import { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "@/lib/email";
import { PLAN_BY_ID } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const prisma = new PrismaClient();

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const email = readArg("email");
  const requestedPlan = readArg("plan");
  const expires = readArg("expires");

  if (!email || !requestedPlan) {
    throw new Error("Usage: npm run plan:override -- --email user@example.com --plan <plan|none> [--expires ISO_DATE]");
  }

  const clearOverride = requestedPlan === "none";
  if (!clearOverride && !Object.prototype.hasOwnProperty.call(PLAN_BY_ID, requestedPlan)) {
    throw new Error(`Unknown plan "${requestedPlan}"`);
  }

  const expiresAt = expires ? new Date(expires) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error(`Invalid expiration date "${expires}"`);
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (!user) throw new Error(`No user found for ${normalizedEmail}`);

  const planOverride = clearOverride ? null : (requestedPlan as PlanId);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      planOverride,
      planOverrideExpiresAt: planOverride ? expiresAt : null,
    },
  });

  console.log(
    planOverride
      ? `Granted ${planOverride} override to ${normalizedEmail}${expiresAt ? ` until ${expiresAt.toISOString()}` : ""}`
      : `Cleared plan override for ${normalizedEmail}`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
