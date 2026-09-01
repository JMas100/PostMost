"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { decrypt, encrypt } from "@/lib/crypto";
import { getEffectivePlan, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import crypto from "crypto";
import { requireWorkspace, requireRole } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

/** Checks the per-plan connected-marketplace limit before letting a new platform be connected
 *  (existing platforms being reconnected/updated never count against it). */
async function canConnectMarketplace(userId: string, platform: string): Promise<{ allowed: boolean; reason?: string }> {
  const [user, activePlatforms] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: PLAN_ASSIGNMENT_SELECT }),
    prisma.marketplaceAccount.findMany({
      where: { userId, isActive: true },
      select: { platform: true },
      distinct: ["platform"],
    }),
  ]);
  const plan = getEffectivePlan(user);
  if (plan.marketplaces === -1) return { allowed: true };
  const alreadyConnected = activePlatforms.some((a) => a.platform === platform);
  if (alreadyConnected || activePlatforms.length < plan.marketplaces) return { allowed: true };
  return {
    allowed: false,
    reason: `The ${plan.name} plan includes ${plan.marketplaces} connected marketplaces. Upgrade to connect more.`,
  };
}

export interface AccountConnectionInput {
  platform: string;
  displayName: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  externalId?: string;
  settings?: Record<string, unknown>;
  /** "password" (default) or "session" -- see MarketplaceAccount.authMethod. When "session",
   *  accessToken holds an already-verified, JSON-serialized cookie array (verification happens
   *  in the caller, e.g. the extension session-capture route), not a password, so the
   *  verifyLogin check below is skipped. */
  authMethod?: string;
}

export async function getMarketplaceAccounts() {
  const { workspaceUserId } = await requireWorkspace();
  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId: workspaceUserId, isActive: true },
  });
  return accounts.map((account) => {
    const { accessToken: _a, refreshToken: _r, ...rest } = account;
    return { ...rest, hasCredentials: Boolean(account.accessToken) };
  });
}

export async function connectMarketplaceAccount(input: AccountConnectionInput) {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const userId = ctx.workspaceUserId;

  const existing = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform: input.platform, isActive: true },
  });

  if (!existing) {
    const gate = await canConnectMarketplace(userId, input.platform);
    if (!gate.allowed) {
      throw new Error(gate.reason);
    }
  }

  // For browser-automation platforms connecting with a password, actually attempt a login
  // before ever saving it -- a wrong username/password should be caught here, not silently
  // stored and only discovered the next time a post/delist job fails. Only a confirmed
  // rejection blocks saving; an inconclusive check (Playwright unavailable, likely bot
  // detection) never does, since that's not evidence the credentials are actually wrong.
  // Session-based connections are already verified by the caller (see verifySession in the
  // extension session-capture route) before this function is ever called, so this is skipped
  // for those -- input.accessToken there is a cookie array, not a password.
  if (input.accessToken && input.authMethod !== "session") {
    const adapter = getAdapter(input.platform);
    if (adapter?.verifyLogin) {
      const check = await adapter.verifyLogin(input.displayName, input.accessToken);
      if (check.status === "rejected") {
        throw new Error(`Couldn't sign in to ${adapter.name} with these credentials: ${check.error}`);
      }
    }
  }

  const data = {
    displayName: input.displayName,
    // A blank password/token field on an update means "leave it as-is," not "clear it" — the
    // old behavior nulled these out on any update where the field wasn't re-entered, silently
    // disconnecting the account's ability to post/delist.
    accessToken: input.accessToken ? encrypt(input.accessToken) : existing?.accessToken ?? null,
    refreshToken: input.refreshToken ? encrypt(input.refreshToken) : existing?.refreshToken ?? null,
    tokenExpiresAt: input.tokenExpiresAt ?? existing?.tokenExpiresAt ?? null,
    externalId: input.externalId ?? existing?.externalId ?? null,
    authMethod: input.authMethod ?? existing?.authMethod ?? "password",
    isActive: true,
    settings: input.settings ? JSON.stringify(input.settings) : existing?.settings ?? null,
  };

  const account = existing
    ? await prisma.marketplaceAccount.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.marketplaceAccount.create({
        data: {
          userId,
          platform: input.platform,
          ...data,
        },
      });

  await logAudit(ctx, {
    action: existing ? "marketplace.reconnected" : "marketplace.connected",
    targetType: "MarketplaceAccount",
    targetId: account.id,
    message: `${existing ? "Reconnected" : "Connected"} ${input.platform} (${input.displayName})`,
  });

  revalidatePath("/settings");
  return { success: true, account: { ...account, accessToken: null, refreshToken: null } };
}

export async function disconnectMarketplaceAccount(accountId: string) {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);

  const account = await prisma.marketplaceAccount.findFirst({ where: { id: accountId, userId: ctx.workspaceUserId } });
  const result = await prisma.marketplaceAccount.updateMany({
    where: { id: accountId, userId: ctx.workspaceUserId },
    data: { isActive: false },
  });
  if (result.count > 0 && account) {
    await logAudit(ctx, {
      action: "marketplace.disconnected",
      targetType: "MarketplaceAccount",
      targetId: accountId,
      message: `Disconnected ${account.platform} (${account.displayName})`,
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function getAccountForPlatform(platform: string) {
  const { workspaceUserId } = await requireWorkspace();
  const account = await prisma.marketplaceAccount.findFirst({
    where: { userId: workspaceUserId, platform, isActive: true },
  });
  if (!account) return null;
  return {
    ...account,
    accessToken: account.accessToken ? decrypt(account.accessToken) : null,
    refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
    settings: account.settings ? JSON.parse(account.settings) : {},
  };
}

export async function getOAuthUrl(platform: string) {
  const ctx = await requireWorkspace();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const userId = ctx.workspaceUserId;

  const adapter = getAdapter(platform);
  if (!adapter || adapter.authType !== "oauth" || !adapter.getAuthUrl) {
    throw new Error("OAuth is not supported for this marketplace");
  }

  const existing = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform, isActive: true },
  });
  if (!existing) {
    const gate = await canConnectMarketplace(userId, platform);
    if (!gate.allowed) {
      throw new Error(gate.reason);
    }
  }

  // A random `state`, bound to this browser via an httpOnly cookie and required to match on
  // callback, is what stops OAuth account-linking CSRF: without it, an attacker who starts their
  // own authorization flow can hand a victim a link carrying the attacker's own `code`, and it
  // gets silently linked to the victim's account instead of the attacker's. Generated for every
  // provider, not just Etsy -- PKCE alone doesn't cover this for providers that don't use it.
  const state = crypto.randomBytes(24).toString("base64url");

  let codeVerifier: string | undefined;
  let challenge: string | undefined;
  if (platform === "etsy") {
    codeVerifier = generateCodeVerifier();
    challenge = getCodeChallenge(codeVerifier);
  }

  (await cookies()).set(
    "postmost_oauth",
    JSON.stringify({ platform, state, verifier: codeVerifier, expiresAt: Date.now() + 600_000 }),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600 }
  );

  return adapter.getAuthUrl(challenge ? { codeVerifier: challenge, state } : { state });
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function getCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
