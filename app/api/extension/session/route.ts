import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdapter } from "@/lib/marketplaces";
import { connectMarketplaceAccount } from "@/lib/actions/accounts";
import type { SessionCookie } from "@/lib/marketplaces/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Phase 1: only Poshmark exposes the browser-session connect flow, so the whole chain (extension
// capture, this endpoint, Playwright cookie consumption) gets proven against one real account
// before rolling out to the other manual-adapter platforms.
const SESSION_AUTH_PLATFORMS = new Set(["poshmark"]);

const MAX_COOKIES = 200;
const MAX_BODY_BYTES = 200_000;

function isValidCookie(c: unknown): c is SessionCookie {
  if (!c || typeof c !== "object") return false;
  const cookie = c as Record<string, unknown>;
  return (
    typeof cookie.name === "string" &&
    typeof cookie.value === "string" &&
    typeof cookie.domain === "string" &&
    typeof cookie.path === "string" &&
    typeof cookie.expires === "number" &&
    typeof cookie.httpOnly === "boolean" &&
    typeof cookie.secure === "boolean" &&
    (cookie.sameSite === "Strict" || cookie.sameSite === "Lax" || cookie.sameSite === "None")
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: { platform?: unknown; cookies?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platform = typeof body.platform === "string" ? body.platform : "";
  if (!SESSION_AUTH_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Browser-session connect isn't available for this platform yet" }, { status: 400 });
  }

  const cookies = Array.isArray(body.cookies) ? body.cookies : [];
  if (cookies.length === 0 || cookies.length > MAX_COOKIES || !cookies.every(isValidCookie)) {
    return NextResponse.json({ error: "Missing or invalid cookies" }, { status: 400 });
  }

  const adapter = getAdapter(platform);
  if (!adapter?.verifySession) {
    return NextResponse.json({ error: "Browser-session connect isn't available for this platform yet" }, { status: 400 });
  }

  // Never save a session that doesn't actually work -- a stale/rejected capture should surface
  // immediately, not silently connect and only be discovered the next time a job runs.
  const check = await adapter.verifySession(cookies as SessionCookie[]);
  if (check.status === "rejected") {
    return NextResponse.json({ error: check.error }, { status: 422 });
  }

  try {
    const result = await connectMarketplaceAccount({
      platform,
      displayName: `${adapter.name} (browser session)`,
      accessToken: JSON.stringify(cookies),
      authMethod: "session",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
