import crypto from "crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { getAdapter } from "@/lib/marketplaces";
import type { ListingData, PlatformAccount, SessionCookie } from "@/lib/marketplaces/types";

const PORT = process.env.PORT || 4000;

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.BROWSER_WORKER_SECRET;
  const bearer = req.headers.authorization;
  if (!secret) {
    res.status(500).json({ error: "BROWSER_WORKER_SECRET is not configured" });
    return;
  }
  if (!bearer || !timingSafeEqualString(bearer, `Bearer ${secret}`)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

type ExecuteBody =
  | { platform: string; action: "post"; listing: ListingData; account: PlatformAccount }
  | { platform: string; action: "delist"; externalId: string; account: PlatformAccount }
  | { platform: string; action: "updatePrice"; externalId: string; newPrice: number; account: PlatformAccount; sku?: string | null }
  | { platform: string; action: "verifyLogin"; username: string; password: string }
  | { platform: string; action: "verifySession"; cookies: SessionCookie[] };

const app = express();
app.use(express.json({ limit: "10mb" })); // generous enough for a listing's photo URL array

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/** One endpoint, dispatched by `action` -- mirrors the MarketplaceAdapter interface
 *  (lib/marketplaces/types.ts) exactly, since this just runs the real adapter methods with a
 *  real, normally-installed Chromium instead of Vercel's @sparticuz/chromium workaround. See
 *  createManualAdapter in lib/marketplaces/automation/create-adapter.ts for the caller side. */
app.post("/execute", requireAuth, async (req: Request, res: Response) => {
  // A straightforward assertion, not exhaustive runtime validation -- this endpoint is
  // bearer-secret-authenticated and only ever called by the Next.js app itself
  // (createManualAdapter in lib/marketplaces/automation/create-adapter.ts), not public input.
  const body = req.body as ExecuteBody;
  const adapter = body?.platform ? getAdapter(body.platform) : undefined;
  if (!adapter) {
    res.status(400).json({ error: `Unknown platform: ${body.platform}` });
    return;
  }

  try {
    switch (body.action) {
      case "post": {
        const result = await adapter.post(body.listing, body.account);
        res.json(result);
        return;
      }
      case "delist": {
        if (!adapter.delist) {
          res.status(400).json({ error: `${adapter.name} doesn't support delisting` });
          return;
        }
        const result = await adapter.delist(body.externalId, body.account);
        res.json(result);
        return;
      }
      case "updatePrice": {
        if (!adapter.updatePrice) {
          res.status(400).json({ error: `${adapter.name} doesn't support price updates` });
          return;
        }
        const result = await adapter.updatePrice(body.externalId, body.newPrice, body.account, body.sku);
        res.json(result);
        return;
      }
      case "verifyLogin": {
        if (!adapter.verifyLogin) {
          res.status(400).json({ error: `${adapter.name} doesn't support login verification` });
          return;
        }
        const result = await adapter.verifyLogin(body.username, body.password);
        res.json(result);
        return;
      }
      case "verifySession": {
        if (!adapter.verifySession) {
          res.status(400).json({ error: `${adapter.name} doesn't support session verification` });
          return;
        }
        const result = await adapter.verifySession(body.cookies);
        res.json(result);
        return;
      }
      default:
        res.status(400).json({ error: `Unknown action: ${(body as { action?: string }).action}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Browser worker listening on :${PORT}`);
});
