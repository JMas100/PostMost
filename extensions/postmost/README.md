# PostMost Chrome Extension

This extension lets PostMost push a listing into the user’s browser so it can be filled into marketplace sites that do not offer public APIs (Facebook Marketplace, OfferUp, Poshmark, Mercari, Depop, Vinted, Grailed, Craigslist).

## How it works

1. In PostMost, open a listing and click **“Send to extension”** for the manual marketplaces you want to post to.
2. Open the PostMost extension popup from Chrome’s toolbar.
3. Click a marketplace button — the extension opens the site’s listing creation page with the listing data in the URL hash.
4. The extension content script reads the data and tries to fill the form and upload photos automatically.
5. Review the draft and submit on the marketplace site.

## Load the extension (developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this `extensions/postmost` folder.
5. The PostMost icon should appear in Chrome’s toolbar.

## Test

1. Open `https://postmost.co`, sign in, and create a listing.
2. On the listing detail page, click **“Send to extension”** next to a manual marketplace.
3. Open the extension popup and click the marketplace.
4. The marketplace create-listing page opens in a new tab and the form fields are pre-filled.

## Notes

- Marketplace sites change their DOM frequently, so the generic form-filler may need platform-specific tweaks for production reliability.
- Photo uploads may fail if the marketplace blocks cross-origin image fetching. In that case, upload photos manually.
- This extension is for your own accounts. Posting through third-party automation may violate a platform’s Terms of Service; use it responsibly.
