"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { decrypt, encrypt } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";
import crypto from "crypto";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Checks the per-plan connected-marketplace limit before letting a new platform be connected
 *  (existing platforms being reconnected/updated never count against it). */
async function canConnectMarketplace(userId: string, platform: string): Promise<{ allowed: boolean; reason?: string }> {
  const [user, activePlatforms] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.marketplaceAccount.findMany({
      where: { userId, isActive: true },
      select: { platform: true },
      distinct: ["platform"],
    }),
  ]);
  const plan = getPlan(user?.plan);
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
}

export async function getMarketplaceAccounts() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId, isActive: true },
  });
  return accounts.map((account) => {
    const { accessToken: _a, refreshToken: _r, ...rest } = account;
    return { ...rest, hasCredentials: Boolean(account.accessToken) };
  });
}

export async function connectMarketplaceAccount(input: AccountConnectionInput) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const existing = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform: input.platform, isActive: true },
  });

  if (!existing) {
    const gate = await canConnectMarketplace(userId, input.platform);
    if (!gate.allowed) {
      throw new Error(gate.reason);
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

  revalidatePath("/settings");
  return { success: true, account: { ...account, accessToken: null, refreshToken: null } };
}

export async function disconnectMarketplaceAccount(accountId: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  await prisma.marketplaceAccount.updateMany({
    where: { id: accountId, userId },
    data: { isActive: false },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function getAccountForPlatform(platform: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const account = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform, isActive: true },
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
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

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

  let codeVerifier: string | undefined;
  if (platform === "etsy") {
    codeVerifier = generateCodeVerifier();
    const challenge = getCodeChallenge(codeVerifier);
    (await cookies()).set(
      "postmost_oauth_verifier",
      JSON.stringify({ platform, verifier: codeVerifier, expiresAt: Date.now() + 600_000 }),
      { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600 }
    );
    return adapter.getAuthUrl({ codeVerifier: challenge });
  }

  return adapter.getAuthUrl();
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function getCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
