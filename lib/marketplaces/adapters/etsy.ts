import crypto from "crypto";
import { MarketplaceAdapter, ListingData, OAuthTokenResult, PlatformAccount, PostResult } from "../types";

const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://openapi.etsy.com/v3/public/oauth/token";
const ETSY_API_ROOT = "https://openapi.etsy.com/v3/application";

const SCOPES = ["listings_w", "listings_r", "shops_r", "address_r"].join(" ");

function getClientCredentials(): { key: string; secret: string; redirectUri: string } {
  const key = process.env.ETSY_API_KEY || "";
  const secret = process.env.ETSY_API_SECRET || "";
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/marketplace/callback/etsy`;
  if (!key) {
    throw new Error("Etsy OAuth is not configured. Set ETSY_API_KEY.");
  }
  return { key, secret, redirectUri };
}

function etsyHeaders(token: string, key: string) {
  return {
    Authorization: `Bearer ${token}`,
    "x-api-key": key,
    Accept: "application/json",
  };
}

async function getShopId(token: string, key: string, userId: string): Promise<string> {
  const res = await fetch(`${ETSY_API_ROOT}/users/${userId}/shops`, {
    headers: etsyHeaders(token, key),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Could not fetch Etsy shops: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { results?: { shop_id: number }[] };
  const shopId = data.results?.[0]?.shop_id;
  if (!shopId) throw new Error("No Etsy shop found for this account.");
  return String(shopId);
}

function mapWhenMade(condition: string): string {
  const normalized = condition.toLowerCase().trim();
  if (normalized.includes("vintage") || normalized.includes("old")) return "before_2000";
  if (normalized.includes("new")) return "2020_2024";
  return "2020_2024";
}

export const etsyAdapter: MarketplaceAdapter = {
  name: "Etsy",
  id: "etsy",
  supportsApi: true,
  supportsAutomation: false,
  authType: "oauth",
  async post(listing: ListingData, account: PlatformAccount): Promise<PostResult> {
    if (!account.accessToken) {
      return { success: false, error: "Etsy account not connected." };
    }

    const { key } = getClientCredentials();
    const token = account.accessToken;
    const userId = account.externalId;
    if (!userId) {
      return { success: false, error: "Etsy user ID is missing. Reconnect your account." };
    }

    let shopId: string;
    try {
      shopId = (account.settings?.shopId as string) || (await getShopId(token, key, userId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resolve Etsy shop";
      return { success: false, error: message };
    }

    const taxonomyId = (account.settings?.taxonomyId as string) || process.env.ETSY_TAXONOMY_ID;
    const shippingProfileId = (account.settings?.shippingProfileId as string) || process.env.ETSY_SHIPPING_PROFILE_ID;
    if (!taxonomyId || !shippingProfileId) {
      return {
        success: false,
        error: "Etsy taxonomy_id and shipping_profile_id are required. Set them in account settings or env vars.",
      };
    }

    const whoMade = (account.settings?.whoMade as string) || process.env.ETSY_WHO_MADE || "someone_else";
    const whenMade = (account.settings?.whenMade as string) || process.env.ETSY_WHEN_MADE || mapWhenMade(listing.condition);
    const isSupply = (account.settings?.isSupply as string) || process.env.ETSY_IS_SUPPLY || "false";

    const body = new URLSearchParams({
      quantity: String(listing.quantity),
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      who_made: whoMade,
      when_made: whenMade,
      taxonomy_id: taxonomyId,
      shipping_profile_id: shippingProfileId,
      is_supply: isSupply,
      type: "physical",
    });

    if (listing.tags && listing.tags.length > 0) {
      body.set("tags", listing.tags.slice(0, 13).join(","));
    }
    if (listing.material) {
      body.set("materials", listing.material);
    }

    const createRes = await fetch(`${ETSY_API_ROOT}/shops/${shopId}/listings`, {
      method: "POST",
      headers: {
        ...etsyHeaders(token, key),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return { success: false, error: `Etsy listing creation failed: ${createRes.status} ${text}` };
    }

    const createData = (await createRes.json()) as { listing_id?: number; results?: { listing_id?: number }[] };
    const listingId = createData.listing_id || createData.results?.[0]?.listing_id;
    if (!listingId) {
      return { success: false, error: "Etsy listing created without a listing_id" };
    }

    const raw: Record<string, unknown> = { create: createData };

    // Upload images if FormData/Blob are available in this runtime.
    if (typeof FormData !== "undefined" && typeof Blob !== "undefined" && listing.photos.length > 0) {
      const imageUploads = [];
      for (let i = 0; i < Math.min(listing.photos.length, 10); i++) {
        const photoUrl = listing.photos[i];
        imageUploads.push(
          (async () => {
            try {
              const imageRes = await fetch(photoUrl);
              if (!imageRes.ok) return { rank: i, ok: false };
              const blob = await imageRes.blob();
              const form = new FormData();
              form.append("image", blob, `image-${i}.jpg`);
              form.append("rank", String(i));
              const uploadRes = await fetch(
                `${ETSY_API_ROOT}/shops/${shopId}/listings/${listingId}/images`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}`, "x-api-key": key },
                  body: form,
                }
              );
              return { rank: i, ok: uploadRes.ok };
            } catch {
              return { rank: i, ok: false };
            }
          })()
        );
      }
      raw.imageUploads = await Promise.all(imageUploads);
    }

    return {
      success: true,
      externalId: String(listingId),
      externalUrl: `https://www.etsy.com/listing/${listingId}`,
      raw,
    };
  },
  async delist(externalId: string, account: PlatformAccount) {
    if (!account.accessToken) return { success: false, error: "Etsy account not connected." };
    const { key } = getClientCredentials();
    const userId = account.externalId;
    if (!userId) return { success: false, error: "Etsy user ID is missing." };
    let shopId = account.settings?.shopId as string | undefined;
    if (!shopId) {
      try {
        shopId = await getShopId(account.accessToken, key, userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not resolve Etsy shop";
        return { success: false, error: message };
      }
    }
    const res = await fetch(`${ETSY_API_ROOT}/shops/${shopId}/listings/${externalId}`, {
      method: "DELETE",
      headers: etsyHeaders(account.accessToken, key),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Etsy delete failed: ${res.status} ${text}` };
    }
    return { success: true };
  },
  getAuthUrl(opts?: { codeVerifier?: string }) {
    const { key, redirectUri } = getClientCredentials();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: key,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state: crypto.randomUUID(),
    });
    if (opts?.codeVerifier) {
      params.set("code_challenge", opts.codeVerifier);
      params.set("code_challenge_method", "S256");
    }
    return `${ETSY_AUTH_URL}?${params.toString()}`;
  },
  async exchangeCode(code: string, ctx?: { codeVerifier?: string }): Promise<OAuthTokenResult> {
    const { key, redirectUri } = getClientCredentials();
    const verifier = ctx?.codeVerifier;
    if (!verifier) {
      throw new Error("Etsy OAuth code verifier is missing.");
    }

    const tokenRes = await fetch(ETSY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: key,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Etsy token exchange failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      user_id?: number | null;
    };

    const userId = tokenData.user_id ? String(tokenData.user_id) : tokenData.access_token.split(".")[0];

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      externalId: userId,
      displayName: `Etsy seller ${userId}`,
    };
  },
};
