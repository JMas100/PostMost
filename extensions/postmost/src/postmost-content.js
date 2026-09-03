(function () {
  "use strict";

  if (window.__postmostInjected) return;
  window.__postmostInjected = true;

  // This script only ever runs on a domain manifest.json's content_scripts.matches allows it on
  // (*.postmost.co -- production, or staging.postmost.co which tracks the `staging` git branch's
  // Vercel deployments -- or localhost for dev). Whichever one that is, the extension/session/
  // sync API it needs to call is always same-origin with the page itself, so there's nothing to
  // hardcode or special-case here.
  const SYNC_ORIGIN = location.origin;

  // Tell the PostMost page the extension is present.
  window.postMessage({ source: "postmost-extension", type: "READY" }, "*");

  window.addEventListener("message", async (event) => {
    // event.source === window already means this was posted by code running in this same page
    // (not a cross-frame message) -- checking event.origin too is redundant defense-in-depth,
    // not a stronger guarantee, since this content script only ever runs on origins matching
    // manifest.json's content_scripts.matches in the first place.
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== "postmost") return;

    if (data.type === "PING") {
      window.postMessage({ source: "postmost-extension", type: "READY" }, "*");
      return;
    }

    if (data.type === "CAPTURE_SESSION") {
      try {
        const response = await chrome.runtime.sendMessage({ type: "CAPTURE_SESSION", platform: data.platform });
        if (!response?.ok) {
          window.postMessage(
            { source: "postmost-extension", type: "SESSION_CAPTURE_ERROR", platform: data.platform, message: response?.error || "Couldn't read the session" },
            "*"
          );
          return;
        }

        const res = await fetch(`${SYNC_ORIGIN}/api/extension/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ platform: data.platform, cookies: response.cookies }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          window.postMessage(
            { source: "postmost-extension", type: "SESSION_CAPTURE_ERROR", platform: data.platform, message: body.error || "Couldn't save the session" },
            "*"
          );
          return;
        }

        window.postMessage({ source: "postmost-extension", type: "SESSION_CAPTURED", platform: data.platform }, "*");
      } catch (err) {
        window.postMessage(
          { source: "postmost-extension", type: "SESSION_CAPTURE_ERROR", platform: data.platform, message: err.message },
          "*"
        );
      }
      return;
    }

    if (data.type !== "SEND_LISTING") return;

    try {
      await chrome.storage.local.set({
        pendingListing: data.listing,
        pendingListingId: data.listing.id,
        pendingPlatforms: data.platforms || [],
        filledPlatforms: [],
        sentAt: Date.now(),
      });

      window.postMessage({ source: "postmost-extension", type: "ACK" }, "*");
    } catch (err) {
      window.postMessage({ source: "postmost-extension", type: "ERROR", message: err.message }, "*");
    }
  });

  async function flushSyncQueue() {
    const { syncQueue = [] } = await chrome.storage.local.get("syncQueue");
    if (!syncQueue.length) return;
    const remaining = [];
    for (const event of syncQueue) {
      try {
        const res = await fetch(`${SYNC_ORIGIN}/api/extension/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(event),
        });
        if (!res.ok) {
          remaining.push(event);
        }
      } catch (err) {
        console.warn("PostMost: sync event failed", err);
        remaining.push(event);
      }
    }
    await chrome.storage.local.set({ syncQueue: remaining });
  }

  flushSyncQueue();
})();
