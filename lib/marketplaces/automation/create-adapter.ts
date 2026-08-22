import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";
import { runPlaywrightAutomation, runPlaywrightDelist, genericVerifyRemoved, uploadPhotoOnPage } from "./playwright-runner";
import type { AutomationConfig, DelistConfig } from "./playwright-runner";
import type { Page } from "playwright";

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
      if (!externalId) {
        return { success: false, error: `No listing URL recorded for this ${config.name} listing.` };
      }
      return runPlaywrightDelist(
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
    },
  };
}
