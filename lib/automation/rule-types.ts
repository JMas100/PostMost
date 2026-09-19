export const STOCK_SYNC_RULE = "stock_sync";
export const DELIST_ON_SALE_RULE = "delist_on_sale";
export const RELIST_STALE_RULE = "relist_stale";

/** A POSTED listing older than this many days is a relist candidate, by default -- overridable
 *  per user via AutomationRule.config (see parseRelistConfig). */
export const RELIST_STALE_DAYS = 21;

export interface RelistConfig {
  staleDays: number;
  maxPerDay: number;
}

export const DEFAULT_RELIST_CONFIG: RelistConfig = { staleDays: RELIST_STALE_DAYS, maxPerDay: 20 };

/** The sentence's own dropdowns only offer these -- a free-typed number invites a value nobody
 *  actually tested (e.g. 0 days, which would relist everything on every run). */
export const RELIST_STALE_DAYS_OPTIONS = [14, 21, 30, 45] as const;
export const RELIST_MAX_PER_DAY_OPTIONS = [10, 20, 30, 50] as const;

/** AutomationRule.config is a bare Json? column -- validate shape defensively rather than
 *  trusting it, since nothing stops a row from predating this field or holding a stale shape. */
export function parseRelistConfig(config: unknown): RelistConfig {
  const c = config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  const staleDays = typeof c.staleDays === "number" && c.staleDays > 0 ? c.staleDays : DEFAULT_RELIST_CONFIG.staleDays;
  const maxPerDay = typeof c.maxPerDay === "number" && c.maxPerDay > 0 ? c.maxPerDay : DEFAULT_RELIST_CONFIG.maxPerDay;
  return { staleDays, maxPerDay };
}

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
