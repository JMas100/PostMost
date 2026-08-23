import { MarketplaceAdapter, ListingData, OAuthTokenResult, PlatformAccount, PostResult } from "../types";

const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_IDENTITY_URL = "https://api.ebay.com/commerce/identity/v1/user/";
const EBAY_API_ROOT = "https://api.ebay.com";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
];

function getClientCredentials(): { appId: string; certId: string; ruName: string } {
  const appId = process.env.EBAY_APP_ID || "";
  const certId = process.env.EBAY_CERT_ID || "";
  const ruName = process.env.EBAY_RU_NAME || "";
  if (!appId || !certId || !ruName) {
    throw new Error("eBay OAuth is not configured. Set EBAY_APP_ID, EBAY_CERT_ID, and EBAY_RU_NAME.");
  }
  return { appId, certId, ruName };
}

function mapCondition(condition: string): string {
  const normalized = condition.toLowerCase().trim();
  if (normalized === "new" || normalized === "new with tags") return "NEW";
  if (normalized.includes("like new")) return "LIKE_NEW";
  if (normalized.includes("excellent")) return "USED_EXCELLENT";
  if (normalized.includes("very good")) return "USED_VERY_GOOD";
  if (normalized.includes("good")) return "USED_GOOD";
  if (normalized.includes("fair") || normalized.includes("acceptable")) return "USED_ACCEPTABLE";
  if (normalized.includes("poor") || normalized.includes("for parts")) return "FOR_PARTS_OR_NOT_WORKING";
  return "USED_GOOD";
}

function buildAspects(listing: ListingData): Record<string, string[]> {
  const aspects: Record<string, string[]> = {};
  if (listing.brand) aspects.Brand = [listing.brand];
  if (listing.color) aspects.Color = [listing.color];
  if (listing.size) aspects.Size = [listing.size];
  if (listing.material) aspects.Material = [listing.material];
  return aspects;
}

async function ebayRequest(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  marketplaceId?: string
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (marketplaceId) headers["X-EBAY-C-MARKETPLACE"] = marketplaceId;
  const res = await fetch(`${EBAY_API_ROOT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function getDefaultPolicies(
  token: string,
  marketplaceId: string
): Promise<{ payment: string; return: string; fulfillment: string }> {
  const [paymentRes, returnRes, fulfillmentRes] = await Promise.all([
    fetch(
      `${EBAY_API_ROOT}/sell/account/v1/payment_policy?marketplace_id=${marketplaceId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
    ),
    fetch(
      `${EBAY_API_ROOT}/sell/account/v1/return_policy?marketplace_id=${marketplaceId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
    ),
    fetch(
      `${EBAY_API_ROOT}/sell/account/v1/fulfillment_policy?marketplace_id=${marketplaceId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
    ),
  ]);

  const errors: string[] = [];
  const getFirstId = async (res: Response, key: string, name: string) => {
    if (!res.ok) {
      errors.push(`${name} policy fetch failed: ${res.status}`);
      return "";
    }
    const data = (await res.json()) as { paymentPolicies?: { paymentPolicyId?: string }[]; returnPolicies?: { returnPolicyId?: string }[]; fulfillmentPolicies?: { fulfillmentPolicyId?: string }[] };
    const arr = (data as Record<string, unknown>)[`${name.toLowerCase()}Policies`] as Array<Record<string, string>> | undefined;
    if (!arr || arr.length === 0) {
      errors.push(`No ${name.toLowerCase()} policy found`);
      return "";
    }
    return arr[0][key] || "";
  };

  const payment = await getFirstId(paymentRes, "paymentPolicyId", "Payment");
  const returnPolicy = await getFirstId(returnRes, "returnPolicyId", "Return");
  const fulfillment = await getFirstId(fulfillmentRes, "fulfillmentPolicyId", "Fulfillment");

  if (errors.length || !payment || !returnPolicy || !fulfillment) {
    throw new Error(`eBay policies not configured: ${errors.join(", ")}`);
  }

  return { payment, return: returnPolicy, fulfillment };
}

function marketplaceToSiteId(marketplaceId: string): number {
  const map: Record<string, number> = {
    EBAY_US: 0,
    EBAY_CA: 2,
    EBAY_GB: 3,
    EBAY_AU: 15,
    EBAY_AT: 16,
    EBAY_BE: 23,
    EBAY_FR: 71,
    EBAY_DE: 77,
    EBAY_IT: 101,
    EBAY_NL: 146,
    EBAY_ES: 186,
    EBAY_CH: 193,
    EBAY_HK: 201,
    EBAY_IN: 203,
    EBAY_IE: 205,
    EBAY_MY: 207,
    EBAY_PH: 211,
    EBAY_PL: 212,
    EBAY_SG: 216,
  };
  return map[marketplaceId.toUpperCase()] || 0;
}

async function getDefaultMerchantLocation(token: string): Promise<string> {
  const res = await fetch(`${EBAY_API_ROOT}/sell/inventory/v1/location`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Could not fetch eBay inventory locations: ${res.status}`);
  const data = (await res.json()) as { locations?: { merchantLocationKey?: string }[] };
  const key = data.locations?.[0]?.merchantLocationKey;
  if (!key) throw new Error("No eBay inventory location found. Create one in Seller Hub.");
  return key;
}

export const eBayAdapter: MarketplaceAdapter = {
  name: "eBay",
  id: "ebay",
  supportsApi: true,
  supportsAutomation: false,
  authType: "oauth",
  async post(listing: ListingData, account: PlatformAccount): Promise<PostResult> {
    if (!account.accessToken) {
      return {
        success: false,
        error: "eBay account not connected. Please authorize via eBay OAuth.",
      };
    }

    const token = account.accessToken;
    const marketplaceId = (account.settings?.marketplaceId as string) || process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
    const categoryId = (account.settings?.categoryId as string) || process.env.EBAY_CATEGORY_ID;
    if (!categoryId) {
      return { success: false, error: "eBay categoryId is required. Set it in account settings or EBAY_CATEGORY_ID." };
    }

    const sku = listing.sku || `postmost-${Date.now()}`;

    const inventoryPayload = {
      availability: {
        shipToLocationAvailability: { quantity: listing.quantity },
      },
      condition: mapCondition(listing.condition),
      product: {
        title: listing.title,
        description: listing.description,
        aspects: buildAspects(listing),
        imageUrls: listing.photos.slice(0, 12),
      },
    };

    const itemRes = await ebayRequest(token, "PUT", `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, inventoryPayload, marketplaceId);
    if (!itemRes.ok) {
      const text = await itemRes.text();
      return { success: false, error: `eBay inventory item creation failed: ${itemRes.status} ${text}` };
    }

    let policies: { payment: string; return: string; fulfillment: string };
    let merchantLocationKey: string;
    try {
      policies = {
        payment: (account.settings?.paymentPolicyId as string) || "",
        return: (account.settings?.returnPolicyId as string) || "",
        fulfillment: (account.settings?.fulfillmentPolicyId as string) || "",
      };
      if (!policies.payment || !policies.return || !policies.fulfillment) {
        const defaults = await getDefaultPolicies(token, marketplaceId);
        if (!policies.payment) policies.payment = defaults.payment;
        if (!policies.return) policies.return = defaults.return;
        if (!policies.fulfillment) policies.fulfillment = defaults.fulfillment;
      }
      merchantLocationKey = (account.settings?.merchantLocationKey as string) || process.env.EBAY_MERCHANT_LOCATION_KEY || (await getDefaultMerchantLocation(token));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resolve eBay policies/location";
      return { success: false, error: message };
    }

    const offerPayload: Record<string, unknown> = {
      sku,
      marketplaceId,
      format: "FIXED_PRICE",
      availableQuantity: listing.quantity,
      pricingSummary: {
        price: { currency: "USD", value: String(listing.price) },
      },
      listingPolicies: {
        paymentPolicyId: policies.payment,
        returnPolicyId: policies.return,
        fulfillmentPolicyId: policies.fulfillment,
      },
      categoryId,
      merchantLocationKey,
    };

    const offerRes = await ebayRequest(token, "POST", "/sell/inventory/v1/offer", offerPayload, marketplaceId);
    if (!offerRes.ok) {
      const text = await offerRes.text();
      return { success: false, error: `eBay offer creation failed: ${offerRes.status} ${text}` };
    }
    const offerData = (await offerRes.json()) as { offerId?: string };
    if (!offerData.offerId) {
      return { success: false, error: "eBay offer created without an offerId" };
    }

    const publishRes = await ebayRequest(
      token,
      "POST",
      `/sell/inventory/v1/offer/${offerData.offerId}/publish`,
      undefined,
      marketplaceId
    );
    if (!publishRes.ok) {
      const text = await publishRes.text();
      return { success: false, error: `eBay offer publish failed: ${publishRes.status} ${text}` };
    }
    const publishData = (await publishRes.json()) as { listingId?: string; warnings?: unknown[] };
    if (!publishData.listingId) {
      return { success: false, error: "eBay offer published without a listingId" };
    }

    return {
      success: true,
      externalId: publishData.listingId,
      externalUrl: `https://www.ebay.com/itm/${publishData.listingId}`,
      raw: publishData,
    };
  },
  async delist(externalId: string, account: PlatformAccount) {
    if (!account.accessToken) return { success: false, error: "eBay account not connected." };
    const marketplaceId = (account.settings?.marketplaceId as string) || process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
    const siteId = marketplaceToSiteId(marketplaceId);
    const appId = process.env.EBAY_APP_ID || "";
    const devId = process.env.EBAY_DEV_ID || "";
    const certId = process.env.EBAY_CERT_ID || "";

    const body = `<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${externalId}</ItemID>
  <EndingReason>NotAvailable</EndingReason>
</EndItemRequest>`;

    const headers: Record<string, string> = {
      "Content-Type": "text/xml",
      "X-EBAY-API-CALL-NAME": "EndItem",
      "X-EBAY-API-SITEID": String(siteId),
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1225",
      "X-EBAY-API-IAF-TOKEN": account.accessToken,
    };
    if (appId) headers["X-EBAY-API-APP-NAME"] = appId;
    if (devId) headers["X-EBAY-API-DEV-NAME"] = devId;
    if (certId) headers["X-EBAY-API-CERT-NAME"] = certId;

    const res = await fetch(`${EBAY_API_ROOT.replace("https://api.ebay.com", "https://api.ebay.com")}/ws/api.dll?callname=EndItem&siteid=${siteId}&version=1225`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `eBay EndItem failed: ${res.status} ${text}` };
    }
    const text = await res.text();
    if (text.includes("<Ack>Failure</Ack>") || text.includes("<Ack>Warning</Ack>")) {
      const message = text.match(/<ShortMessage>([^<]+)<\/ShortMessage>/)?.[1] || text;
      return { success: false, error: `eBay EndItem error: ${message}` };
    }
    return { success: true };
  },
  getAuthUrl(_opts?: { codeVerifier?: string }) {
    const { appId, ruName } = getClientCredentials();
    const params = new URLSearchParams({
      client_id: appId,
      response_type: "code",
      redirect_uri: ruName,
      scope: SCOPES.join(" "),
    });
    return `${EBAY_AUTH_URL}?${params.toString()}`;
  },
  async exchangeCode(code: string): Promise<OAuthTokenResult> {
    const { appId, certId, ruName } = getClientCredentials();
    const auth = Buffer.from(`${appId}:${certId}`).toString("base64");

    const tokenRes = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: ruName,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`eBay token exchange failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const identityRes = await fetch(EBAY_IDENTITY_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
    });

    let externalId: string | undefined;
    let displayName: string | undefined;
    if (identityRes.ok) {
      const identity = (await identityRes.json()) as { userId?: string; username?: string };
      externalId = identity.userId;
      displayName = identity.username;
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      externalId,
      displayName,
    };
  },
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const { appId, certId } = getClientCredentials();
    const auth = Buffer.from(`${appId}:${certId}`).toString("base64");

    const tokenRes = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: SCOPES.join(" "),
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`eBay token refresh failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: tokenData.access_token,
      // eBay doesn't rotate the refresh token on every refresh — carry the original forward
      // when the response doesn't include a new one.
      refreshToken: tokenData.refresh_token || refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    };
  },
};
