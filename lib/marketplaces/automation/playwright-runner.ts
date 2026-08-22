import type { ListingData, PlatformAccount, PostResult } from "../types";

export interface AutomationStep {
  name: string;
  action: (page: import("playwright").Page, listing: ListingData, account: PlatformAccount) => Promise<void>;
}

export interface AutomationConfig {
  loginUrl: string;
  listingUrl?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  postLoginSteps?: AutomationStep[];
  preSubmitSteps?: AutomationStep[];
  successUrlFragment?: string;
  screenshotOnFailure?: boolean;
  headless?: boolean;
}

export async function runPlaywrightAutomation(
  platformId: string,
  config: AutomationConfig,
  listing: ListingData,
  account: PlatformAccount
): Promise<PostResult> {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Playwright is not available in this environment. ${message}`,
    };
  }

  const username = String(account.externalId || account.settings?.username || "");
  const password = String(account.accessToken || "");
  if (!username || !password) {
    return {
      success: false,
      error: `Missing username or password for ${platformId}. Store username in External ID and password in Access Token fields.`,
    };
  }

  const raw: Record<string, unknown> = {};
  const browser = await playwright.chromium.launch({
    headless: config.headless !== false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(config.loginUrl, { waitUntil: "networkidle" });

    if (config.usernameSelector) {
      await page.fill(config.usernameSelector, username);
    }
    if (config.passwordSelector) {
      await page.fill(config.passwordSelector, password);
    }
    if (config.submitSelector) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
        page.click(config.submitSelector),
      ]);
    }

    if (config.postLoginSteps) {
      for (const step of config.postLoginSteps) {
        await step.action(page, listing, account);
      }
    }

    if (config.listingUrl) {
      await page.goto(config.listingUrl, { waitUntil: "networkidle" });
    }

    if (config.preSubmitSteps) {
      for (const step of config.preSubmitSteps) {
        await step.action(page, listing, account);
      }
    }

    const url = page.url();
    const success = config.successUrlFragment ? url.includes(config.successUrlFragment) : true;

    raw.finalUrl = url;
    raw.title = await page.title().catch(() => "");

    return {
      success,
      externalUrl: url,
      raw,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `${platformId} automation failed: ${message}`, raw };
  } finally {
    await browser.close();
  }
}

export interface DelistConfig {
  loginUrl: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  postLoginSteps?: AutomationStep[];
  /** Optional first click to open a "..." / options menu, if delete lives behind one. */
  openMenuSelectors?: string[];
  /** Selectors tried in order to find the "delete/remove/end listing" control on the listing's own page. */
  deleteSelectors: string[];
  /** Selectors tried in order for a confirmation dialog's confirm button, if the site has one. */
  confirmSelectors?: string[];
  /** After clicking delete (+ confirm), the URL is expected to change away from the listing page,
   *  or the listing page should no longer show this selector (e.g. an "Edit" button only a live
   *  listing has). Used to verify removal actually happened rather than assuming a click succeeded. */
  verifyRemoved: (page: import("playwright").Page, listingUrl: string) => Promise<boolean>;
  headless?: boolean;
}

/**
 * Generic browser-automation delist: log in, navigate directly to the listing's own page
 * (captured as externalUrl when it was posted), click through to remove it, and verify the
 * removal actually took before reporting success. Never reports success it can't confirm —
 * a failed verification is a FAILED delist, not a DELISTED one, so a stale listing never gets
 * silently marked gone when it's still live.
 */
export async function runPlaywrightDelist(
  platformId: string,
  config: DelistConfig,
  listingUrl: string,
  account: PlatformAccount
): Promise<{ success: boolean; error?: string }> {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Playwright is not available in this environment. ${message}` };
  }

  const username = String(account.externalId || account.settings?.username || "");
  const password = String(account.accessToken || "");
  if (!username || !password) {
    return { success: false, error: `Missing username or password for ${platformId}.` };
  }

  const browser = await playwright.chromium.launch({
    headless: config.headless !== false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(config.loginUrl, { waitUntil: "networkidle" });
    if (config.usernameSelector) await page.fill(config.usernameSelector, username);
    if (config.passwordSelector) await page.fill(config.passwordSelector, password);
    if (config.submitSelector) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
        page.click(config.submitSelector),
      ]);
    }
    if (config.postLoginSteps) {
      for (const step of config.postLoginSteps) {
        await step.action(page, { title: "", description: "", price: 0, quantity: 0, condition: "", category: "", photos: [] }, account);
      }
    }

    await page.goto(listingUrl, { waitUntil: "networkidle" });

    if (config.openMenuSelectors) {
      for (const sel of config.openMenuSelectors) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0) {
          await loc.click();
          await page.waitForTimeout(400);
          break;
        }
      }
    }

    let clicked = false;
    for (const sel of config.deleteSelectors) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      return { success: false, error: "Couldn't find a delete/remove control on the listing page." };
    }

    if (config.confirmSelectors) {
      for (const sel of config.confirmSelectors) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0) {
          await loc.click();
          break;
        }
      }
    }

    await page.waitForTimeout(1500);
    const removed = await config.verifyRemoved(page, listingUrl);
    if (!removed) {
      return { success: false, error: "Delete was clicked but the listing still appears live — not marking it removed." };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `${platformId} delist automation failed: ${message}` };
  } finally {
    await browser.close();
  }
}

/**
 * Best-effort, platform-agnostic check that a listing is actually gone: either the page
 * navigated away from the listing's own URL (most sites redirect after a delete), or the page
 * itself now reads as removed/unavailable/sold. Used as the default verifyRemoved for adapters
 * that don't need anything more specific.
 */
export async function genericVerifyRemoved(page: import("playwright").Page, listingUrl: string): Promise<boolean> {
  if (page.url() !== listingUrl) return true;
  const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  return (
    bodyText.includes("no longer available") ||
    bodyText.includes("listing not found") ||
    bodyText.includes("has been removed") ||
    bodyText.includes("this item has sold")
  );
}

export async function uploadPhotoOnPage(
  page: import("playwright").Page,
  selector: string,
  photoUrl: string,
  index: number
): Promise<boolean> {
  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = { name: `photo-${index}.jpg`, mimeType: "image/jpeg", buffer };
    const input = page.locator(selector).first();
    if (!(await input.count())) return false;
    await input.setInputFiles(file);
    return true;
  } catch {
    return false;
  }
}
