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

  async function tryFill(listing) {
    if (!window.PostMostFillListing) {
      console.warn("PostMost: form filler not loaded");
      return false;
    }
    console.log("PostMost: filling listing", listing);
    return window.PostMostFillListing(listing);
  }

  async function processHash() {
    const hash = location.hash;
    if (!hash.startsWith("#postmost=")) return false;
    try {
      const payload = JSON.parse(atob(hash.replace("#postmost=", "")));
      history.replaceState(null, "", location.pathname + location.search);
      return await tryFill(payload.listing);
    } catch (err) {
      console.warn("PostMost: failed to decode hash payload", err);
      return false;
    }
  }

  async function processStorage() {
    const platform = getPlatformFromHost();
    if (!platform) return false;
    try {
      const { pendingListing, pendingPlatforms } = await chrome.storage.local.get([
        "pendingListing",
        "pendingPlatforms",
      ]);
      if (!pendingListing) return false;
      if (pendingPlatforms && pendingPlatforms.length > 0 && !pendingPlatforms.includes(platform)) {
        return false;
      }
      await chrome.storage.local.remove(["pendingListing", "pendingPlatforms"]);
      return await tryFill(pendingListing);
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
      tryFill(request.listing).then((result) => sendResponse({ success: result }));
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
