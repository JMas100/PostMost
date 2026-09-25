// Service worker for PostMost extension.
//
// Previously also handled CAPTURE_SESSION (reading a marketplace's cookie jar for the now-retired
// browser-session-connect flow -- see popup.js's own history and
// components/marketplace-account-card.tsx's ExtensionOnlyInfo for the full reasoning: server-side
// automation, even session-connected, still meant ongoing headless traffic against the
// marketplace, which is exactly the bot-detection risk that flow existed to avoid in the first
// place for the *login* step only). Nothing calls that message anymore from either popup.js or the
// web app, so it's gone, and the "cookies" permission that only existed for it was dropped from
// manifest.json along with it.
chrome.runtime.onInstalled.addListener(() => {
  console.log("PostMost extension installed");
});
