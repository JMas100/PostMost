(function () {
  const PLATFORM_URLS = {
    facebook: "https://www.facebook.com/marketplace/create/item/",
    offerup: "https://offerup.com/item/new/",
    poshmark: "https://poshmark.com/create-listing",
    mercari: "https://www.mercari.com/sell/",
    depop: "https://www.depop.com/products/create/",
    vinted: "https://www.vinted.com/items/new",
    grailed: "https://www.grailed.com/sell/new",
    craigslist: "https://post.craigslist.org/",
  };

  function getPlatformFromHost() {
    const host = location.hostname;
    for (const id of Object.keys(PLATFORM_URLS)) {
      if (host.includes(id)) return id;
    }
    return null;
  }

  function getPlatformFromHash() {
    const hash = location.hash;
    if (!hash.startsWith("#postmost=")) return null;
    try {
      const payload = JSON.parse(atob(hash.replace("#postmost=", "")));
      return payload.platform;
    } catch {
      return null;
    }
  }

  function createOverlay() {
    const id = "postmost-overlay";
    if (document.getElementById(id)) return document.getElementById(id);
    const el = document.createElement("div");
    el.id = id;
    el.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.95);
      color: #fff;
      padding: 14px 18px;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      max-width: 280px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      line-height: 1.4;
    `;
    document.body.appendChild(el);
    return el;
  }

  function updateOverlay(html) {
    const el = createOverlay();
    el.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">PostMost</div>${html}`;
  }

  async function tryFill(listing, source) {
    if (!window.PostMostFillListing) {
      console.warn("PostMost: form filler not loaded");
      return { success: false, error: "Form filler not loaded" };
    }
    try {
      updateOverlay(`Filling ${source}...`);
      const result = await window.PostMostFillListing(listing);
      const status = result.submitted ? "Form filled. Please review and confirm." : "Form partially filled. Manual review needed.";
      updateOverlay(`${status}<br/><small>Filled: ${(result.filled || []).join(", ") || "none"}</small>`);
      await chrome.storage.local.set({ lastFillResult: result });
      return { success: result.submitted, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateOverlay(`Fill failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async function processHash() {
    const hash = location.hash;
    if (!hash.startsWith("#postmost=")) return false;
    try {
      const payload = JSON.parse(atob(hash.replace("#postmost=", "")));
      history.replaceState(null, "", location.pathname + location.search);
      if (payload && payload.listing) {
        await tryFill(payload.listing, "hash payload");
        return true;
      }
    } catch (err) {
      console.warn("PostMost: failed to decode hash payload", err);
    }
    return false;
  }

  async function processStorage() {
    const platform = getPlatformFromHost();
    if (!platform) return false;
    try {
      const { pendingListing, pendingPlatforms, autoFill } = await chrome.storage.local.get([
        "pendingListing",
        "pendingPlatforms",
        "autoFill",
      ]);
      if (!pendingListing) return false;
      if (pendingPlatforms && pendingPlatforms.length > 0 && !pendingPlatforms.includes(platform)) {
        return false;
      }
      if (autoFill !== false) {
        await chrome.storage.local.remove(["pendingListing", "pendingPlatforms"]);
      }
      return await tryFill(pendingListing, platform) !== null;
    } catch (err) {
      console.warn("PostMost: failed to fill from storage", err);
      return false;
    }
  }

  async function init() {
    if (await processHash()) return;
    await processStorage();
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === "FILL_LISTING" && request.listing) {
      tryFill(request.listing, "popup").then((result) => sendResponse(result));
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
