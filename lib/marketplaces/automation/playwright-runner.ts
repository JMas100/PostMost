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
