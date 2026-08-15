"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { decrypt, encrypt } from "@/lib/crypto";
import crypto from "crypto";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
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

  const data = {
    displayName: input.displayName,
    accessToken: input.accessToken ? encrypt(input.accessToken) : null,
    refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
    tokenExpiresAt: input.tokenExpiresAt ?? null,
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
  getUserId(session);

  const adapter = getAdapter(platform);
  if (!adapter || adapter.authType !== "oauth" || !adapter.getAuthUrl) {
    throw new Error("OAuth is not supported for this marketplace");
  }

  let codeVerifier: string | undefined;
  if (platform === "etsy") {
    codeVerifier = generateCodeVerifier();
    const challenge = getCodeChallenge(codeVerifier);
    cookies().set(
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
