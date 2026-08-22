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

  let codeVerifier: string | undefined;
  if (platform === "etsy") {
    const verifierCookie = (await cookies()).get("postmost_oauth_verifier")?.value;
    if (verifierCookie) {
      try {
        const parsed = JSON.parse(verifierCookie) as {
          platform: string;
          verifier: string;
          expiresAt: number;
        };
        if (parsed.platform === "etsy" && parsed.expiresAt > Date.now()) {
          codeVerifier = parsed.verifier;
        }
      } catch {
        // ignore malformed cookie
      }
      (await cookies()).delete("postmost_oauth_verifier");
    }
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
