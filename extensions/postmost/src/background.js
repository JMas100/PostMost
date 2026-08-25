// Service worker for PostMost extension.
chrome.runtime.onInstalled.addListener(() => {
  console.log("PostMost extension installed");
});

// Cookie domain per platform -- kept small and separate from popup.js's own PLATFORM_URLS
// (a different concern: where to open a listing-creation tab, not which domain's cookie jar to
// read). Only platforms with a live browser-session connect flow need an entry here.
const COOKIE_DOMAINS = {
  poshmark: "poshmark.com",
  mercari: "mercari.com",
  depop: "depop.com",
  facebook: "facebook.com",
  craigslist: "craigslist.org",
  offerup: "offerup.com",
  vinted: "vinted.com",
  grailed: "grailed.com",
};

// chrome.cookies.getAll() is only callable from the background service worker in Manifest V3 --
// content scripts (even on a matched host) can't call it directly, which is why this has to be
// a message handler rather than living in postmost-content.js itself.
function toPlaywrightCookie(cookie) {
  const sameSiteMap = { no_restriction: "None", lax: "Lax", strict: "Strict", unspecified: "Lax" };
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: typeof cookie.expirationDate === "number" ? cookie.expirationDate : -1,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: sameSiteMap[cookie.sameSite] || "Lax",
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CAPTURE_SESSION") return false;

  const domain = COOKIE_DOMAINS[message.platform];
  if (!domain) {
    sendResponse({ ok: false, error: "Unsupported platform" });
    return false;
  }

  chrome.cookies
    .getAll({ domain })
    .then((cookies) => {
      if (!cookies.length) {
        sendResponse({ ok: false, error: "No active session found for this site — log in, then try again." });
        return;
      }
      sendResponse({ ok: true, cookies: cookies.map(toPlaywrightCookie) });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: err?.message || "Couldn't read cookies" });
    });

  return true; // keep the message channel open for the async sendResponse above
});
