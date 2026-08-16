(function () {
  "use strict";

  const utils = window.PostMostUtils || {};
  const PLATFORMS = window.PostMostPlatforms || {};

  function getPlatformId() {
    const host = location.hostname;
    for (const [id, config] of Object.entries(PLATFORMS)) {
      if (host.includes(config.host)) return id;
    }
    return null;
  }

  function getGenericSelectors(label) {
    const kw = label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const keywords = [kw, ...label.toLowerCase().split(/\s+/)].filter(Boolean);
    return keywords.flatMap((word) => [
      `input[name*="${word}" i]`,
      `input[id*="${word}" i]`,
      `input[placeholder*="${word}" i]`,
      `textarea[name*="${word}" i]`,
      `textarea[id*="${word}" i]`,
      `textarea[placeholder*="${word}" i]`,
      `select[name*="${word}" i]`,
      `select[id*="${word}" i]`,
      `[aria-label*="${word}" i]`,
      `[contenteditable="true"][aria-label*="${word}" i]`,
    ]);
  }

  async function fillGenericField(label, value) {
    if (value === undefined || value === null || value === "") return false;
    const selectors = getGenericSelectors(label);
    const el = await utils.waitForElement(selectors, 5000);
    if (el && utils.simulateTyping) utils.simulateTyping(el, String(value));
    return !!el;
  }

  async function fillGeneric(listing) {
    const result = { filled: [], missing: [], photos: false, submitted: false };
    const fields = [
      ["title", listing.title],
      ["price", listing.price],
      ["description", listing.description],
      ["condition", listing.condition],
      ["category", listing.category],
      ["brand", listing.brand],
      ["size", listing.size],
      ["color", listing.color],
      ["material", listing.material],
    ];
    for (const [label, value] of fields) {
      const ok = await fillGenericField(label, value);
      if (ok) result.filled.push(label);
      else if (value) result.missing.push(label);
    }

    if (listing.photos && listing.photos.length > 0) {
      result.photos = await utils.uploadPhotos(listing.photos, []);
    }

    await utils.sleep(500);
    const btn = utils.findButtonByText(["post", "publish", "list", "submit", "next", "continue"]);
    if (btn) {
      btn.click();
      result.submitted = true;
    }
    return result;
  }

  async function fillWithConfig(config, listing) {
    const result = { filled: [], missing: [], photos: false, submitted: false };

    if (typeof config.fill === "function") {
      await config.fill.call(config, listing, result);
      return result;
    }

    for (const [field, selectors] of Object.entries(config.fields || {})) {
      const value = listing[field];
      if (value === undefined || value === null || value === "") continue;
      const el = await utils.waitForElement(selectors, 7000);
      if (el) {
        utils.simulateTyping(el, String(value));
        result.filled.push(field);
      } else {
        result.missing.push(field);
      }
    }

    if (listing.photos && listing.photos.length > 0) {
      result.photos = await utils.uploadPhotos(listing.photos, config.photoInput || []);
    }

    await utils.sleep(config.submitDelay || 500);
    if (config.submitTexts) {
      const btn = utils.findButtonByText(config.submitTexts);
      if (btn) {
        btn.click();
        result.submitted = true;
        return result;
      }
    }
    if (config.submit) {
      const btn = await utils.waitForElement(config.submit, 4000);
      if (btn) {
        btn.click();
        result.submitted = true;
      }
    }
    return result;
  }

  async function fillListing(listing) {
    const platformId = getPlatformId();
    if (!document.body) {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
    }
    await utils.sleep(1000);
    const config = platformId ? PLATFORMS[platformId] : null;
    const result = config ? await fillWithConfig(config, listing) : await fillGeneric(listing);
    result.platform = platformId || "unknown";
    result.timestamp = Date.now();
    return result;
  }

  window.PostMostFillListing = fillListing;
})();
