export const STOCK_SYNC_RULE = "stock_sync";
export const DELIST_ON_SALE_RULE = "delist_on_sale";
export const RELIST_STALE_RULE = "relist_stale";

/** A POSTED listing older than this many days is a relist candidate. */
export const RELIST_STALE_DAYS = 21;

/** The relist-stale cron runs once daily at 4:13 UTC (vercel.json) -- this is the next
 *  occurrence of that, expressed relatively so it's honest without exposing a UTC clock time
 *  that wouldn't mean anything relative to the viewer's own timezone. Shared by Dashboard's
 *  "Needs a decision" card and Automation's own relist rule preview, so the two pages can never
 *  disagree about when the next run actually is. */
export function nextRelistRun(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 13, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
