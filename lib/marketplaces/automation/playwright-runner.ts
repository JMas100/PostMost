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

  let page: import("playwright").Page | undefined;

  async function fail(error: string): Promise<PostResult> {
    const screenshotUrl = page ? await captureFailureScreenshot(page, platformId) : undefined;
    return {
      success: false,
      error: screenshotUrl ? `${error} | Screenshot: ${screenshotUrl}` : error,
      raw,
    };
  }

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();

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

    // Never assume a login form submit actually logged in — wrong credentials, an unexpected
    // 2FA/verification prompt, or a layout change all leave the browser looking similar to a
    // fresh page load. If the password field is still there (or we never left the login URL),
    // the login didn't take, and continuing on would just fill out a form nobody can see.
    if (config.passwordSelector) {
      const stillOnLogin =
        page.url() === config.loginUrl ||
        (await page.locator(config.passwordSelector).count().catch(() => 0)) > 0;
      if (stillOnLogin) {
        return await fail(`Couldn't log into ${platformId} — check the stored username and password.`);
      }
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
    // Never report success without a positive signal: either a configured successUrlFragment
    // match, or — as a generic fallback — the page actually navigated away from the listing
    // creation URL, since submitting a listing form almost always redirects somewhere else
    // (the new listing's own page, a confirmation screen, the seller's dashboard). Staying on
    // the same create-listing URL means nothing was actually submitted.
    const success = config.successUrlFragment
      ? url.includes(config.successUrlFragment)
      : !config.listingUrl || url !== config.listingUrl;

    raw.finalUrl = url;
    raw.title = await page.title().catch(() => "");

    if (!success) {
      return await fail(`${platformId} listing submission couldn't be confirmed — the page never left the listing form.`);
    }

    return {
      success: true,
      externalUrl: url,
      raw,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return await fail(`${platformId} automation failed: ${message}`);
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

export interface DelistOutcome {
  success: boolean;
  error?: string;
  /** Ordered trail of what actually happened, so a failure is diagnosable without rerunning it
   *  in headed mode. This is the point of this instrumentation: these selectors are unverified
   *  against live accounts, so when one breaks, the trail should say exactly where. */
  steps: string[];
  /** Public URL of a full-page screenshot taken at the point of failure, if storage is
   *  configured. Not captured on success — only failures need a human to look at them. */
  screenshotUrl?: string;
}

async function captureFailureScreenshot(
  page: import("playwright").Page,
  platformId: string
): Promise<string | undefined> {
  try {
    const { isStorageConfigured, getStorage } = await import("@/lib/storage");
    if (!isStorageConfigured()) return undefined;
    const bytes = await page.screenshot({ fullPage: true, type: "png" });
    const key = `automation-debug/${platformId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { url } = await getStorage().upload(key, bytes, "image/png");
    return url;
  } catch {
    // Screenshot capture is best-effort — never let it mask the real failure reason.
    return undefined;
  }
}

/**
 * Generic browser-automation delist: log in, navigate directly to the listing's own page
 * (captured as externalUrl when it was posted), click through to remove it, and verify the
 * removal actually took before reporting success. Never reports success it can't confirm —
 * a failed verification is a FAILED delist, not a DELISTED one, so a stale listing never gets
 * silently marked gone when it's still live.
 *
 * These selectors are written from general knowledge of each site's UI, not verified against a
 * live account — every failure records a step trail and a screenshot so the real point of
 * breakage is visible immediately when this does eventually run for real, instead of a bare
 * "failed" with no way to tell which assumption was wrong.
 */
export async function runPlaywrightDelist(
  platformId: string,
  config: DelistConfig,
  listingUrl: string,
  account: PlatformAccount
): Promise<DelistOutcome> {
  const steps: string[] = [];

  let playwright;
  try {
    playwright = await import("playwright");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Playwright is not available in this environment. ${message}`, steps };
  }

  const username = String(account.externalId || account.settings?.username || "");
  const password = String(account.accessToken || "");
  if (!username || !password) {
    return { success: false, error: `Missing username or password for ${platformId}.`, steps };
  }

  const browser = await playwright.chromium.launch({
    headless: config.headless !== false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let page: import("playwright").Page | undefined;

  async function fail(error: string): Promise<DelistOutcome> {
    steps.push(`FAILED: ${error}`);
    const screenshotUrl = page ? await captureFailureScreenshot(page, platformId) : undefined;
    return { success: false, error, steps, screenshotUrl };
  }

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();

    await page.goto(config.loginUrl, { waitUntil: "networkidle" });
    steps.push(`Loaded login page: ${config.loginUrl}`);

    if (config.usernameSelector) await page.fill(config.usernameSelector, username);
    if (config.passwordSelector) await page.fill(config.passwordSelector, password);
    if (config.submitSelector) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}),
        page.click(config.submitSelector),
      ]);
    }
    steps.push("Submitted login form");

    if (config.passwordSelector) {
      const stillOnLogin =
        page.url() === config.loginUrl ||
        (await page.locator(config.passwordSelector).count().catch(() => 0)) > 0;
      if (stillOnLogin) {
        return await fail(`Couldn't log into ${platformId} — check the stored username and password.`);
      }
    }

    if (config.postLoginSteps) {
      for (const step of config.postLoginSteps) {
        await step.action(page, { title: "", description: "", price: 0, quantity: 0, condition: "", category: "", photos: [] }, account);
        steps.push(`Ran post-login step: ${step.name}`);
      }
    }

    await page.goto(listingUrl, { waitUntil: "networkidle" });
    steps.push(`Navigated to listing: ${listingUrl}`);

    if (config.openMenuSelectors) {
      let opened = false;
      for (const sel of config.openMenuSelectors) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0) {
          await loc.click();
          await page.waitForTimeout(400);
          steps.push(`Opened options menu via: ${sel}`);
          opened = true;
          break;
        }
      }
      if (!opened) steps.push("No options-menu selector matched (continuing — delete may not be behind one)");
    }

    let deleteSelectorUsed: string | undefined;
    for (const sel of config.deleteSelectors) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click();
        deleteSelectorUsed = sel;
        break;
      }
    }
    if (!deleteSelectorUsed) {
      return fail(
        `Couldn't find a delete/remove control on the listing page. Tried: ${config.deleteSelectors.join(", ")}`
      );
    }
    steps.push(`Clicked delete control: ${deleteSelectorUsed}`);

    if (config.confirmSelectors) {
      let confirmed = false;
      for (const sel of config.confirmSelectors) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0) {
          await loc.click();
          steps.push(`Clicked confirm control: ${sel}`);
          confirmed = true;
          break;
        }
      }
      if (!confirmed) steps.push("No confirm-dialog selector matched (continuing — site may not require one)");
    }

    await page.waitForTimeout(1500);
    const removed = await config.verifyRemoved(page, listingUrl);
    steps.push(`Verification check: ${removed ? "listing appears removed" : "listing still appears live"}`);
    if (!removed) {
      return fail("Delete was clicked but the listing still appears live — not marking it removed.");
    }
    return { success: true, steps };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`${platformId} delist automation failed: ${message}`);
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
