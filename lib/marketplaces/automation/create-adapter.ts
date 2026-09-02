import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult, CredentialCheckResult } from "../types";
import { runPlaywrightAutomation, runPlaywrightDelist, runPlaywrightUpdatePrice, genericVerifyRemoved, genericVerifyPriceUpdated, uploadPhotoOnPage, verifyLogin, verifySession } from "./playwright-runner";
import type { SessionCookie } from "../types";
import type { AutomationConfig, DelistConfig, PriceUpdateConfig } from "./playwright-runner";
import type { Page } from "playwright-core";

// Set in production only (see worker/README.md) -- when present, every manual-adapter method
// below forwards to the dedicated browser-worker service over HTTP instead of launching
// Chromium in this process. Unset (the default, including inside the worker itself, which never
// needs to call itself), every method runs today's in-process Playwright automation unchanged --
// this is what keeps local dev working with no worker required at all.
const BROWSER_WORKER_URL = process.env.BROWSER_WORKER_URL;

/** Deliberately no fallback to in-process automation if this fails -- see worker/README.md for
 *  why: falling back to @sparticuz/chromium in an already-degraded scenario would silently
 *  reintroduce the exact fragility the worker exists to remove. A thrown error here surfaces as
 *  a normal job failure and gets picked up by the existing CrossPostJob retry/backoff. */
async function callBrowserWorker<T>(body: Record<string, unknown>): Promise<T> {
  const secret = process.env.BROWSER_WORKER_SECRET;
  if (!secret) throw new Error("BROWSER_WORKER_SECRET is not configured");

  const res = await fetch(`${BROWSER_WORKER_URL!.replace(/\/$/, "")}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error || `Browser worker returned ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface ManualAdapterConfig extends AutomationConfig {
  id: string;
  name: string;
  /**
   * How to remove a live listing on this platform. Selectors here are best-effort — written
   * from general knowledge of each site's UI, not verified against a live account. They're
   * tried in order and the whole thing fails loudly (never reports a false success) if none
   * match or removal can't be confirmed afterward. Needs real-account testing before this is
   * trusted for real users.
   */
  delete: {
    openMenuSelectors?: string[];
    deleteSelectors: string[];
    confirmSelectors?: string[];
    verifyRemoved?: DelistConfig["verifyRemoved"];
  };
  /**
   * How to change a live listing's price on this platform. Same caveat as `delete`: best-effort
   * selectors, not verified against a live account. Optional -- a platform without this simply
   * doesn't support automated price pushes yet (queueRepriceJobs still only queues jobs for
   * platforms where the adapter defines updatePrice, via this config being present).
   */
  reprice?: {
    editTriggerSelectors?: string[];
    priceSelectors: string[];
    saveSelectors: string[];
    verifyPriceUpdated?: PriceUpdateConfig["verifyPriceUpdated"];
  };
}

function defaultListingSteps(listing: ListingData) {
  return [
    {
      name: "fill-title",
      action: async (page: Page) => {
        for (const sel of ['input[name="title"]', 'input[id*="title" i]', 'input[placeholder*="title" i]', 'input[placeholder*="Title" i]']) {
          const loc = page.locator(sel).first();
          if ((await loc.count()) > 0) {
            await loc.fill(listing.title);
            break;
          }
        }
      },
    },
    {
      name: "fill-price",
      action: async (page: Page) => {
        for (const sel of ['input[name="price"]', 'input[id*="price" i]', 'input[placeholder*="price" i]']) {
          const loc = page.locator(sel).first();
          if ((await loc.count()) > 0) {
            await loc.fill(String(listing.price));
            break;
          }
        }
      },
    },
    {
      name: "fill-description",
      action: async (page: Page) => {
        for (const sel of ['textarea[name="description"]', 'textarea[id*="description" i]', 'textarea[placeholder*="description" i]']) {
          const loc = page.locator(sel).first();
          if ((await loc.count()) > 0) {
            await loc.fill(listing.description);
            break;
          }
        }
      },
    },
    {
      name: "upload-photos",
      action: async (page: Page) => {
        const uploadInput = 'input[type="file"][accept*="image"]';
        for (let i = 0; i < Math.min(listing.photos.length, 5); i++) {
          const ok = await uploadPhotoOnPage(page, uploadInput, listing.photos[i], i);
          if (!ok) break;
        }
      },
    },
    {
      name: "submit-form",
      action: async (page: Page) => {
        const submitSelectors = ['button[type="submit"]', 'button:has-text("Post")', 'button:has-text("Publish")', 'button:has-text("List")', 'button:has-text("Submit")'];
        for (const sel of submitSelectors) {
          try {
            const loc = page.locator(sel).first();
            if ((await loc.count()) > 0) {
              await loc.click();
              await page.waitForTimeout(2000);
              return;
            }
          } catch {
            continue;
          }
        }
      },
    },
  ];
}

export function createManualAdapter(config: ManualAdapterConfig): MarketplaceAdapter {
  return {
    name: config.name,
    id: config.id,
    supportsApi: false,
    supportsAutomation: true,
    authType: "manual",
    authFields: [
      { key: "username", label: "Username / email", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
    async post(listing: ListingData, account: PlatformAccount): Promise<PostResult> {
      if (BROWSER_WORKER_URL) {
        return callBrowserWorker<PostResult>({ platform: config.id, action: "post", listing, account });
      }
      if (!account.accessToken) {
        return { success: false, error: `No password stored for ${config.name}.` };
      }
      const mergedConfig: AutomationConfig = {
        ...config,
        preSubmitSteps: config.preSubmitSteps || defaultListingSteps(listing),
      };
      const result = await runPlaywrightAutomation(config.id, mergedConfig, listing, account);
      // These platforms have no API-issued id we can capture — the listing's own URL is the
      // only stable handle we have, so it doubles as externalId (delist() below navigates to it).
      if (result.success && result.externalUrl && !result.externalId) {
        result.externalId = result.externalUrl;
      }
      return result;
    },
    async delist(externalId: string, account: PlatformAccount) {
      if (BROWSER_WORKER_URL) {
        return callBrowserWorker<{ success: boolean; error?: string }>({ platform: config.id, action: "delist", externalId, account });
      }
      if (!externalId) {
        return { success: false, error: `No listing URL recorded for this ${config.name} listing.` };
      }
      const outcome = await runPlaywrightDelist(
        config.id,
        {
          loginUrl: config.loginUrl,
          usernameSelector: config.usernameSelector,
          passwordSelector: config.passwordSelector,
          submitSelector: config.submitSelector,
          postLoginSteps: config.postLoginSteps,
          openMenuSelectors: config.delete.openMenuSelectors,
          deleteSelectors: config.delete.deleteSelectors,
          confirmSelectors: config.delete.confirmSelectors,
          verifyRemoved: config.delete.verifyRemoved || genericVerifyRemoved,
        },
        externalId,
        account
      );
      if (outcome.success) return { success: true };
      // Fold the step trail + screenshot into the error string — the MarketplaceAdapter
      // interface only carries {success, error}, and this is unverified automation where the
      // whole point of the trail is to be visible wherever the error ends up (PlatformListing
      // .errorMessage, AutomationEvent.message), not just in a log a human has to go dig up.
      const trail = outcome.steps.length ? ` | Steps: ${outcome.steps.join(" → ")}` : "";
      const shot = outcome.screenshotUrl ? ` | Screenshot: ${outcome.screenshotUrl}` : "";
      return { success: false, error: `${outcome.error || "Delist failed"}${trail}${shot}` };
    },
    ...(config.reprice
      ? {
          async updatePrice(externalId: string, newPrice: number, account: PlatformAccount) {
            if (BROWSER_WORKER_URL) {
              return callBrowserWorker<{ success: boolean; error?: string }>({
                platform: config.id,
                action: "updatePrice",
                externalId,
                newPrice,
                account,
              });
            }
            // sku is eBay-specific (see MarketplaceAdapter.updatePrice) -- Playwright automation
            // navigates by listing URL and never needs it.
            if (!externalId) {
              return { success: false, error: `No listing URL recorded for this ${config.name} listing.` };
            }
            const outcome = await runPlaywrightUpdatePrice(
              config.id,
              {
                loginUrl: config.loginUrl,
                usernameSelector: config.usernameSelector,
                passwordSelector: config.passwordSelector,
                submitSelector: config.submitSelector,
                postLoginSteps: config.postLoginSteps,
                editTriggerSelectors: config.reprice!.editTriggerSelectors,
                priceSelectors: config.reprice!.priceSelectors,
                saveSelectors: config.reprice!.saveSelectors,
                verifyPriceUpdated: config.reprice!.verifyPriceUpdated || genericVerifyPriceUpdated,
              },
              externalId,
              newPrice,
              account
            );
            if (outcome.success) return { success: true };
            const trail = outcome.steps.length ? ` | Steps: ${outcome.steps.join(" → ")}` : "";
            const shot = outcome.screenshotUrl ? ` | Screenshot: ${outcome.screenshotUrl}` : "";
            return { success: false, error: `${outcome.error || "Price update failed"}${trail}${shot}` };
          },
        }
      : {}),
    async verifyLogin(username: string, password: string): Promise<CredentialCheckResult> {
      if (BROWSER_WORKER_URL) return callVerifyOnWorker({ platform: config.id, action: "verifyLogin", username, password });
      return verifyLogin(config.id, config, username, password);
    },
    async verifySession(cookies: SessionCookie[]): Promise<CredentialCheckResult> {
      if (BROWSER_WORKER_URL) return callVerifyOnWorker({ platform: config.id, action: "verifySession", cookies });
      return verifySession(config.id, { loginUrl: config.loginUrl, listingUrl: config.listingUrl, passwordSelector: config.passwordSelector }, cookies);
    },
  };
}

/** verifyLogin/verifySession are the one exception to callBrowserWorker's throw-on-failure
 *  contract: their own CredentialCheckResult type already has an "unknown" status specifically
 *  for "couldn't reach a verdict" (Playwright unavailable, bot detection, a timeout) -- a
 *  deliberate design choice (see types.ts) so an infrastructure problem never blocks a user from
 *  saving real credentials. The worker being unreachable is exactly that kind of infrastructure
 *  problem, so it degrades to "unknown" here instead of throwing and surfacing as an unhandled
 *  action error to someone just trying to connect an account. */
async function callVerifyOnWorker(body: Record<string, unknown>): Promise<CredentialCheckResult> {
  try {
    return await callBrowserWorker<CredentialCheckResult>(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Browser worker unreachable";
    return { status: "unknown", error: message };
  }
}
