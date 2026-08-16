(function () {
  "use strict";

  if (window.__postmostInjected) return;
  window.__postmostInjected = true;

  // Tell the PostMost page the extension is present.
  window.postMessage({ source: "postmost-extension", type: "READY" }, "*");

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "postmost") return;

    if (data.type === "PING") {
      window.postMessage({ source: "postmost-extension", type: "READY" }, "*");
      return;
    }

    if (data.type !== "SEND_LISTING") return;

    try {
      await chrome.storage.local.set({
        pendingListing: data.listing,
        pendingPlatforms: data.platforms || [],
        filledPlatforms: [],
        sentAt: Date.now(),
      });

      window.postMessage({ source: "postmost-extension", type: "ACK" }, "*");
    } catch (err) {
      window.postMessage({ source: "postmost-extension", type: "ERROR", message: err.message }, "*");
    }
  });
})();
