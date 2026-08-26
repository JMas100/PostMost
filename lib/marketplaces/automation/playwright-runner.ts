import type { ListingData, PlatformAccount, PostResult, CredentialCheckResult, SessionCookie } from "../types";

/** Phrases that show up across most login forms when credentials are rejected -- checked as a
 *  supplement to the "did the password field disappear" heuristic, since some sites re-render
 *  the same login form with an error banner rather than staying in a state that looks identical
 *  to a fresh page load. */
const CREDENTIAL_ERROR_PHRASES = [
  "incorrect password",
  "invalid password",
  "wrong password",
  "invalid credentials",
  "incorrect username",
  "couldn't find an account",
  "we don't recognize",
  "doesn't match our records",
  "check your email and password",
];

export interface LoginAttemptResult {
  success: boolean;
  error?: string;
}

/**
 * Fills and submits a login form, then reports whether it actually worked. Never assumes a
 * submit succeeded just because it didn't throw -- wrong credentials, a 2FA/verification
 * interstitial, or a layout change all need to be told apart from a real login, so this checks
 * both a positive signal (left the login page, no password field left) and known rejection
 * copy before calling it a success.
 *
 * A 2FA prompt is the one case this can't fully resolve: the password field is gone (2FA is a
 * separate step after it), so this reports "success" even though the account isn't actually
 * usable yet without completing that step. There's no generic way to detect an arbitrary site's
 * 2FA interstitial without per-site selectors, so this is a known, documented limitation rather
 * than a silent gap.
 */
export async function attemptLogin(
  page: import("playwright").Page,
  config: { loginUrl: string; usernameSelector?: string; passwordSelector?: string; submitSelector?: string },
  username: string,
  password: string
): Promise<LoginAttemptResult> {
  // "networkidle" is too strict for real-world sites with persistent background network chatter
  // (analytics, polling) -- confirmed live against Mercari, where it made page.goto() time out
  // and throw before ever reaching the actual login check. "domcontentloaded" resolves
  // reliably; subsequent fill()/click() calls already auto-wait for their own elements to be
  // ready, and the settle wait after submit gives client-rendered result state time to paint.
  await page.goto(config.loginUrl, { waitUntil: "domcontentloaded" });

  if (config.usernameSelector) await page.fill(config.usernameSelector, username);
  if (config.passwordSelector) await page.fill(config.passwordSelector, password);
  if (config.submitSelector) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.click(config.submitSelector),
    ]);
    await page.waitForTimeout(1500);
  }

  if (!config.passwordSelector) return { success: true };

  // The password field still being present is the primary signal: a real logged-in page
  // essentially never has one. URL equality alone is deliberately NOT treated as sufficient —
  // some sites handle a successful login without a hard navigation (client-side routing that
  // never changes the URL Playwright sees), and using URL-unchanged as a standalone trigger
  // produces false rejections on exactly those sites.
  const stillOnLogin = (await page.locator(config.passwordSelector).count().catch(() => 0)) > 0;

  const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const matchedError = CREDENTIAL_ERROR_PHRASES.find((phrase) => bodyText.includes(phrase));

  if (stillOnLogin || matchedError) {
    return {
      success: false,
      error: matchedError
        ? `The site reported: "${matchedError}"`
        : "The login form didn't accept these credentials",
    };
  }

  return { success: true };
}

/**
 * Seeds a browser context with a captured session (instead of filling a login form) and
 * confirms it actually leaves the page authenticated before anything proceeds -- same "never
 * assume, always check" principle as attemptLogin, just for a cookie-based session instead of a
 * password. Checked against whatever page.url() ends up at after navigating (the caller decides
 * where), using the same "is a password field visible" heuristic as attemptLogin, inverted: if
 * one shows up, the cookies didn't actually authenticate us (expired, revoked, or wrong site).
 */
export async function authenticateWithSession(
  context: import("playwright").BrowserContext,
  page: import("playwright").Page,
  config: { loginUrl: string; listingUrl?: string; passwordSelector?: string },
  cookies: SessionCookie[]
): Promise<LoginAttemptResult> {
  await context.addCookies(cookies);
  // "networkidle" is too strict here -- confirmed live against Mercari, whose login page never
  // fully quiets down (persistent analytics/polling), so page.goto() with that wait condition
  // just times out and throws before the page state is ever inspected, regardless of whether
  // the session was actually good or bad. "domcontentloaded" resolves reliably; the settle wait
  // below gives client-rendered content (React, etc.) time to paint before the check runs.
  await page.goto(config.listingUrl || config.loginUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  if (!config.passwordSelector) return { success: true };

  const loggedOut = (await page.locator(config.passwordSelector).count().catch(() => 0)) > 0;
  if (loggedOut) {
    return { success: false, error: "The saved session has expired or was rejected — reconnect via the browser extension." };
  }
  return { success: true };
}

export function parseSessionCookies(serialized: string): SessionCookie[] | null {
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Standalone credential check for the "Connect account" flow -- attempts a real login with
 * nothing else attached, so a wrong username/password is caught before it's ever saved, rather
 * than silently accepted and only discovered the next time a post/delist job fails. Bot
 * detection is the real limitation here: some sites actively block headless browser logins
 * regardless of whether the credentials are correct -- that surfaces as "unknown", not
 * "rejected", specifically so it never blocks a user with genuinely correct credentials.
 */
export async function verifyLogin(
  platformId: string,
  config: { loginUrl: string; usernameSelector?: string; passwordSelector?: string; submitSelector?: string },
  username: string,
  password: string
): Promise<CredentialCheckResult> {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "unknown", error: `Playwright is not available in this environment. ${message}` };
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    // Runs inline in the user-facing "Connect" click rather than the async job worker, so it
    // gets a tighter budget than post()/delist() would — a slow or hung site should fail fast
    // with a clear message instead of eating most of the route's execution time budget.
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(15_000);
    const result = await attemptLogin(page, config, username, password);
    if (result.success) return { status: "verified" };
    return { status: "rejected", error: result.error || "The login form didn't accept these credentials" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Timeout")) {
      return { status: "unknown", error: `${platformId} took too long to respond — try connecting again.` };
    }
    return { status: "unknown", error: `Couldn't verify ${platformId} credentials: ${message}` };
  } finally {
    await browser.close();
  }
}

/**
 * Standalone session check for the extension's "capture session" flow -- mirrors verifyLogin,
 * but for a captured cookie array instead of a username/password pair. Same reasoning applies:
 * an inconclusive check ("unknown") never blocks saving, since a timeout or bot-detection block
 * isn't evidence the session itself is bad.
 */
export async function verifySession(
  platformId: string,
  config: { loginUrl: string; listingUrl?: string; passwordSelector?: string },
  cookies: SessionCookie[]
): Promise<CredentialCheckResult> {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "unknown", error: `Playwright is not available in this environment. ${message}` };
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(15_000);
    const result = await authenticateWithSession(context, page, config, cookies);
    if (result.success) return { status: "verified" };
    return { status: "rejected", error: result.error || "The saved session didn't leave the browser logged in" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Timeout")) {
      return { status: "unknown", error: `${platformId} took too long to respond — try connecting again.` };
    }
    return { status: "unknown", error: `Couldn't verify ${platformId} session: ${message}` };
  } finally {
    await browser.close();
  }
}

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

  const isSessionAuth = account.authMethod === "session";
  const sessionCookies = isSessionAuth ? parseSessionCookies(account.accessToken || "") : null;
  const username = String(account.externalId || account.settings?.username || "");
  const password = String(account.accessToken || "");
  if (isSessionAuth) {
    if (!sessionCookies) {
      return { success: false, error: `No saved session for ${platformId}. Reconnect via the browser extension.` };
    }
  } else if (!username || !password) {
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

    // Never assume a login form submit (or a replayed session) actually left us authenticated —
    // wrong credentials, an expired/rejected session, an unexpected 2FA/verification prompt, or
    // a layout change all leave the browser looking similar to a fresh page load. Both paths
    // check both a positive signal and known rejection copy before calling it a success, and
    // continuing on from a failed one would just fill out a form nobody can see.
    let navigatedToListingUrl = false;
    if (isSessionAuth) {
      const sessionResult = await authenticateWithSession(context, page, config, sessionCookies!);
      if (!sessionResult.success) {
        return await fail(`Couldn't use the saved ${platformId} session — ${sessionResult.error}`);
      }
      navigatedToListingUrl = Boolean(config.listingUrl);
    } else {
      const loginResult = await attemptLogin(page, config, username, password);
      if (!loginResult.success) {
        return await fail(`Couldn't log into ${platformId} — ${loginResult.error || "check the stored username and password."}`);
      }
    }

    if (config.postLoginSteps) {
      for (const step of config.postLoginSteps) {
        await step.action(page, listing, account);
      }
    }

    if (config.listingUrl && !navigatedToListingUrl) {
      // See the note on attemptLogin's goto -- "networkidle" hangs on sites with persistent
      // background network activity instead of resolving once the page is actually usable.
      await page.goto(config.listingUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
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

  const isSessionAuth = account.authMethod === "session";
  const sessionCookies = isSessionAuth ? parseSessionCookies(account.accessToken || "") : null;
  const username = String(account.externalId || account.settings?.username || "");
  const password = String(account.accessToken || "");
  if (isSessionAuth) {
    if (!sessionCookies) {
      return { success: false, error: `No saved session for ${platformId}. Reconnect via the browser extension.`, steps };
    }
  } else if (!username || !password) {
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

    if (isSessionAuth) {
      steps.push("Applying saved session");
      const sessionResult = await authenticateWithSession(context, page, config, sessionCookies!);
      if (!sessionResult.success) {
        return await fail(`Couldn't use the saved ${platformId} session — ${sessionResult.error}`);
      }
    } else {
      steps.push(`Loading login page: ${config.loginUrl}`);
      const loginResult = await attemptLogin(page, config, username, password);
      if (!loginResult.success) {
        return await fail(`Couldn't log into ${platformId} — ${loginResult.error || "check the stored username and password."}`);
      }
    }
    steps.push("Logged in");

    if (config.postLoginSteps) {
      for (const step of config.postLoginSteps) {
        await step.action(page, { title: "", description: "", price: 0, quantity: 0, condition: "", category: "", photos: [] }, account);
        steps.push(`Ran post-login step: ${step.name}`);
      }
    }

    // See the note on attemptLogin's goto -- "networkidle" hangs on sites with persistent
    // background network activity instead of resolving once the page is actually usable.
    await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
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
