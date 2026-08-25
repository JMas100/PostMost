# PostMost Chrome Extension

This extension lets PostMost push a listing into the user’s browser so it can be filled into marketplace sites that do not offer public APIs (Facebook Marketplace, OfferUp, Poshmark, Mercari, Depop, Vinted, Grailed, Craigslist).

It also supports connecting a marketplace account via browser session instead of a stored password (Poshmark only for now — see "Browser-session connect" below) — this is what makes two-factor-authenticated accounts connectable at all, since PostMost never sees the password or needs to complete 2FA itself.

## How it works

1. In PostMost, open a listing and click **Publish**. Marketplaces without a public API and no
   browser-session connection are labeled **"Via extension"** — those are the ones this handles.
2. The listing content (title, description, price, photos) is handed to the extension and stored
   in `chrome.storage.local`, not the URL — open the PostMost extension popup from Chrome's
   toolbar to see it queued.
3. Click a marketplace button in the popup — the extension opens that site's listing creation
   page in a new tab.
4. The extension's content script reads the queued listing from `chrome.storage.local` and tries
   to fill the form and upload photos automatically.
5. Review the draft and submit on the marketplace site.

## Load the extension (developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this `extensions/postmost` folder.
5. The PostMost icon should appear in Chrome’s toolbar.

`manifest.json` is deliberately scoped to `https://postmost.co/*` only — no `localhost` or
`*.vercel.app`, since the latter is a wildcard over every app hosted on Vercel's shared domain,
not just PostMost's, and Chrome Web Store review flags exactly that kind of unnecessarily broad
host permission. To test against a local dev server or a preview deployment, temporarily add
`http://localhost:3000/*` and/or `https://your-preview-url.vercel.app/*` to both
`host_permissions` and the first `content_scripts` entry's `matches` in your own local copy —
don't commit that back.

## Test

1. Open `https://postmost.co`, sign in, and create a listing.
2. On the listing detail page, select a marketplace labeled "Via extension" and click **Publish**.
3. Open the extension popup and click the marketplace.
4. The marketplace create-listing page opens in a new tab and the form fields are pre-filled.

## Browser-session connect

Instead of typing a marketplace password into PostMost, Settings → Marketplace accounts → a
platform's "Connect" dialog offers a "Browser session" tab (only shown when this extension is
detected, and only for platforms in `SESSION_AUTH_PLATFORMS` in
`app/api/extension/session/route.ts` — Poshmark only as of this writing):

1. Click "Open [Platform] login" — a new tab opens to the site's real login page.
2. Log in there normally, including any 2FA/verification step. PostMost never sees this.
3. Come back to the PostMost tab and click "I've logged in — connect my session."
4. `postmost-content.js` asks `background.js` (the only place `chrome.cookies.getAll()` can run
   in Manifest V3) to read that domain's cookies, then POSTs them to
   `/api/extension/session`, which does a real headless-browser check before saving anything.

This needs the `cookies` permission (added in manifest v1.1.0) — real users on an existing
install will see Chrome disable the extension and prompt for permission re-approval on next
launch until they review it.

## Notes

- Marketplace sites change their DOM frequently, so the generic form-filler may need platform-specific tweaks for production reliability.
- Photo uploads may fail if the marketplace blocks cross-origin image fetching. In that case, upload photos manually.
- This extension is for your own accounts. Posting through third-party automation may violate a platform’s Terms of Service; use it responsibly.
- Session cookies aren't permanent — some sites refresh them via background requests a real
  browser makes automatically, which a static captured snapshot won't get. Reconnecting is the
  fix when a job reports the session expired.
