/** Shared across every phase run in a single invocation of /api/jobs/run (crosspost jobs, then
 *  stock-sync, then relist-stale) -- each manual-adapter job launches a full real Chromium
 *  instance (@sparticuz/chromium, on heavy SPA sites like Mercari/Poshmark/OfferUp), and running
 *  several sequentially in one serverless invocation was found to exhaust the function's memory
 *  partway through a batch (confirmed live: net::ERR_INSUFFICIENT_RESOURCES on the 2nd/3rd
 *  browser launch in the same invocation). Capping the total across all three phases forces the
 *  rest onto a fresh invocation -- the next real-time trigger, or the cron backstop -- with full
 *  resources restored, instead of accumulating pressure in one process. OAuth platforms
 *  (eBay/Etsy) never launch a browser, so they're never counted against this. */
export const MAX_BROWSER_JOBS_PER_INVOCATION = 1;

export interface BrowserJobBudget {
  remaining: number;
}

export function createBrowserJobBudget(): BrowserJobBudget {
  return { remaining: MAX_BROWSER_JOBS_PER_INVOCATION };
}
