(function () {
  "use strict";
  const utils = window.PostMostUtils || {};

  // Same platform ids as PLATFORM_URLS in popup.js, but that file isn't loaded here (popup.html
  // and this content-script group are separate execution contexts) -- platforms.js already is
  // (see manifest.json's content_scripts order), and only the id list is actually needed below,
  // not the create-listing URLs, so reusing window.PostMostPlatforms's keys avoids a second copy
  // instead of duplicating a URL map this file never reads values from.
  const PLATFORM_IDS = Object.keys(window.PostMostPlatforms || {});

  const LISTING_PATTERNS = {
    facebook: /\/marketplace\/item\//,
    offerup: /\/item\//,
    poshmark: /\/listing\//,
    mercari: /\/items\/[a-zA-Z0-9_-]+/,
    depop: /\/products\/[a-zA-Z0-9_-]+/,
    vinted: /\/items\/[a-zA-Z0-9_-]+/,
    grailed: /\/listings\/[0-9]+/,
    craigslist: /\/d\/[^/]+\//,
  };

  function getPlatformFromHost() {
    const host = location.hostname;
    for (const id of PLATFORM_IDS) {
      if (host.includes(id)) return id;
    }
    return null;
  }

  function isListingDetailUrl(platform, url = location.href) {
    const pattern = LISTING_PATTERNS[platform];
    return pattern ? pattern.test(url) : false;
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
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
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
        max-width: 300px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        line-height: 1.4;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  // Overlay content is a mix of hardcoded markup (buttons/styles, written by this file) and
  // dynamic values (platform name, fill results, error messages) that ultimately trace back to
  // the current listing's own fields. Only self-XSS today (a user could only poison their own
  // overlay via their own listing content), but escape dynamic values before they reach
  // innerHTML anyway rather than relying on that staying true as this code evolves.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateOverlay(html) {
    const el = createOverlay();
    el.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">PostMost</div>${html}`;
  }

  async function addSyncEvent(event) {
    const { syncQueue = [] } = await chrome.storage.local.get("syncQueue");
    event.timestamp = Date.now();
    syncQueue.push(event);
    await chrome.storage.local.set({ syncQueue });
  }

  function externalIdFromUrl(platform, url) {
    try {
      const u = new URL(url);
      const path = u.pathname;
      const match = path.match(LISTING_PATTERNS[platform]);
      if (match) return match[0].replace(/^\//, "").replace(/\/$/, "");
      const params = new URLSearchParams(u.search);
      return params.get("id") || params.get("item") || "";
    } catch {
      return "";
    }
  }

  async function savePostedUrl() {
    const platform = getPlatformFromHost();
    const { pendingListingId, pendingPlatforms = [] } = await chrome.storage.local.get([
      "pendingListingId",
      "pendingPlatforms",
    ]);
    if (!platform || !pendingListingId) {
      updateOverlay("No active PostMost listing. Open a listing and click Send to extension.");
      return;
    }
    if (pendingPlatforms.length > 0 && !pendingPlatforms.includes(platform)) {
      updateOverlay(`This marketplace (${escapeHtml(platform)}) is not in the selected platforms.`);
      return;
    }
    const event = {
      type: "posted",
      listingId: pendingListingId,
      platform,
      externalUrl: location.href,
      externalId: externalIdFromUrl(platform, location.href),
    };
    await addSyncEvent(event);
    updateOverlay("Posted listing saved. It will sync when you return to PostMost.");
  }

  async function markSoldOnPage() {
    const platform = getPlatformFromHost();
    const { pendingListingId } = await chrome.storage.local.get("pendingListingId");
    if (!platform || !pendingListingId) {
      updateOverlay("No active PostMost listing.");
      return;
    }
    const event = {
      type: "sold",
      listingId: pendingListingId,
      platform,
      externalUrl: location.href,
      externalId: externalIdFromUrl(platform, location.href),
      soldAt: new Date().toISOString(),
    };
    await addSyncEvent(event);
    updateOverlay("Marked as sold. It will sync when you return to PostMost.");
  }

  function detectSoldText() {
    const text = document.body.innerText.toLowerCase();
    return ["sold", "sale pending", "not available", "this item is sold", "has been sold"].some((t) => text.includes(t));
  }

  function renderListingActions(platform) {
    const sold = detectSoldText();
    const posted = isListingDetailUrl(platform, location.href);
    const buttons = [];
    if (posted) {
      buttons.push(`<button id="postmost-save-posted" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 10px;margin-right:6px;cursor:pointer;font-size:12px;">Save posted URL</button>`);
    }
    buttons.push(`<button id="postmost-mark-sold" style="background:${sold ? "#dc2626" : "#4b5563"};color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;">${sold ? "Looks sold — mark in PostMost" : "Mark as sold"}</button>`);
    buttons.push(`<button id="postmost-hide-overlay" style="background:transparent;color:#9ca3af;border:none;padding:6px 10px;cursor:pointer;font-size:12px;text-decoration:underline;">Hide</button>`);
    updateOverlay(
      `<div style="margin-bottom:8px;">${posted ? "Listing page detected." : "PostMost marketplace helper."}</div><div>${buttons.join("")}</div>`
    );
    document.getElementById("postmost-save-posted")?.addEventListener("click", savePostedUrl);
    document.getElementById("postmost-mark-sold")?.addEventListener("click", markSoldOnPage);
    document.getElementById("postmost-hide-overlay")?.addEventListener("click", () => createOverlay().remove());
  }

  async function tryFill(listing, source) {
    if (!window.PostMostFillListing) {
      console.warn("PostMost: form filler not loaded");
      return { success: false, error: "Form filler not loaded" };
    }
    try {
      updateOverlay(`Filling ${escapeHtml(source)}...`);
      const result = await window.PostMostFillListing(listing);
      const status = result.submitted
        ? "Form filled. Please review and confirm."
        : "Form partially filled. Manual review needed.";
      const filled = escapeHtml((result.filled || []).join(", ") || "none");
      const missing = escapeHtml((result.missing || []).join(", ") || "none");
      updateOverlay(`${status}<br/><small>Filled: ${filled}<br/>Missing: ${missing}</small>`);
      await chrome.storage.local.set({ lastFillResult: result });
      return { success: result.submitted || result.filled.length > 0, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateOverlay(`Fill failed: ${escapeHtml(message)}`);
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

  async function markPlatformFilled(platform) {
    const { filledPlatforms = [] } = await chrome.storage.local.get("filledPlatforms");
    if (!filledPlatforms.includes(platform)) {
      filledPlatforms.push(platform);
      await chrome.storage.local.set({ filledPlatforms });
    }
  }

  async function processStorage() {
    const platform = getPlatformFromHost();
    if (!platform) return false;
    try {
      const { pendingListing, pendingPlatforms, filledPlatforms = [] } = await chrome.storage.local.get([
        "pendingListing",
        "pendingPlatforms",
        "filledPlatforms",
      ]);
      if (!pendingListing) return false;
      if (filledPlatforms.includes(platform)) return false;
      if (pendingPlatforms && pendingPlatforms.length > 0 && !pendingPlatforms.includes(platform)) {
        return false;
      }
      const result = await tryFill(pendingListing, platform);
      if (result.success) {
        await markPlatformFilled(platform);
      }
      return true;
    } catch (err) {
      console.warn("PostMost: failed to fill from storage", err);
      return false;
    }
  }

  async function init() {
    if (await processHash()) return;
    const filled = await processStorage();
    const platform = getPlatformFromHost();
    if (platform) {
      // Wait a moment for dynamic pages to settle, then show helper overlay.
      await utils.sleep(2500);
      renderListingActions(platform);
    }
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
