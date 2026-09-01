import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdapter } from "@/lib/marketplaces";
import { connectMarketplaceAccount } from "@/lib/actions/accounts";

export async function GET(request: NextRequest, props: { params: Promise<{ platform: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  const platform = params.platform;
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (error || !code) {
    const msg = error
      ? `${error}: ${errorDescription || "Authorization failed"}`
      : "Missing authorization code";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(msg)}`, process.env.NEXTAUTH_URL)
    );
  }

  const adapter = getAdapter(platform);
  if (!adapter || adapter.authType !== "oauth" || !adapter.exchangeCode) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("OAuth is not supported for this marketplace")}`,
        process.env.NEXTAUTH_URL
      )
    );
  }

  // Required for every provider: without this, an attacker can hand a victim a callback link
  // carrying the attacker's own authorization code, and it gets silently linked to the victim's
  // account. See getOAuthUrl in lib/actions/accounts.ts for where this cookie is set.
  let codeVerifier: string | undefined;
  const oauthCookie = (await cookies()).get("postmost_oauth")?.value;
  (await cookies()).delete("postmost_oauth");
  let stateOk = false;
  if (oauthCookie) {
    try {
      const parsed = JSON.parse(oauthCookie) as {
        platform: string;
        state: string;
        verifier?: string;
        expiresAt: number;
      };
      if (
        parsed.platform === platform &&
        parsed.expiresAt > Date.now() &&
        returnedState &&
        parsed.state === returnedState
      ) {
        stateOk = true;
        codeVerifier = parsed.verifier;
      }
    } catch {
      // ignore malformed cookie
    }
  }
  if (!stateOk) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("This authorization link is invalid or expired. Please try connecting again.")}`,
        process.env.NEXTAUTH_URL
      )
    );
  }

  try {
    const token = await adapter.exchangeCode(
      code,
      codeVerifier ? { codeVerifier } : undefined
    );

    await connectMarketplaceAccount({
      platform,
      displayName: token.displayName || `${adapter.name} account`,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenExpiresAt: token.tokenExpiresAt,
      externalId: token.externalId,
    });

    return NextResponse.redirect(
      new URL(
        `/settings?connected=${encodeURIComponent(platform)}`,
        process.env.NEXTAUTH_URL
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, process.env.NEXTAUTH_URL)
    );
  }
}
