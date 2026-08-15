/**
 * Robust form-filler for marketplace listing pages.
 * Dispatches to per-platform handlers when available, then falls back to generic field-name matching.
 */

(function () {
  if (window.PostMostFillListing) return;

  const PLATFORM_CONFIG = {
    facebook: {
      host: "facebook.com",
      fields: {
        title: ['[aria-label*="title" i]', '[role="dialog"] input[type="text"]'],
        price: ['[aria-label*="price" i]', 'input[role="spinbutton"]'],
        description: ['[aria-label*="description" i]', '[role="dialog"] textarea'],
        category: ['[aria-label*="category" i]', '[role="combobox"]'],
      },
      submitTexts: ["post", "next"],
      submit: ['button[type="submit"]', '[aria-label*="post" i]', '[aria-label*="next" i]'],
      photoInput: ['input[type="file"][accept*="image"]', '[aria-label*="photo" i]'],
    },
    offerup: {
      host: "offerup.com",
      fields: {
        title: ['input[name="title"]', 'input[id*="title" i]', 'input[placeholder*="title" i]'],
        price: ['input[name="price"]', 'input[id*="price" i]', 'input[placeholder*="price" i]'],
        description: ['textarea[name="description"]', 'textarea[id*="description" i]', 'textarea[placeholder*="description" i]'],
        condition: ['select[name*="condition" i]', 'input[name*="condition" i]'],
        category: ['select[name*="category" i]'],
      },
      submitTexts: ["post", "publish", "list", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    poshmark: {
      host: "poshmark.com",
      fields: {
        title: ['input[name="listing[title]"]', 'input[id*="title" i]', 'input[placeholder*="title" i]'],
        description: ['textarea[name="listing[description]"]', 'textarea[id*="description" i]'],
        price: ['input[name="listing[price]"]', 'input[id*="price" i]'],
        size: ['select[name*="size" i]', 'input[name*="size" i]'],
        brand: ['input[name*="brand" i]'],
        color: ['input[name*="color" i]'],
      },
      submitTexts: ["next", "list", "submit", "post"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    mercari: {
      host: "mercari.com",
      fields: {
        title: ['input[name*="name" i]', 'input[placeholder*="What are you selling?" i]'],
        description: ['textarea[name*="description" i]', 'textarea[placeholder*="description" i]'],
        price: ['input[name*="price" i]', 'input[placeholder*="price" i]'],
        condition: ['select[name*="condition" i]'],
        category: ['select[name*="category" i]'],
        brand: ['input[name*="brand" i]'],
        color: ['input[name*="color" i]'],
      },
      submitTexts: ["list", "sell", "post", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    depop: {
      host: "depop.com",
      fields: {
        title: ['input[name*="title" i]', 'input[placeholder*="title" i]'],
        description: ['textarea[name*="description" i]', 'textarea[placeholder*="description" i]'],
        price: ['input[name*="price" i]', 'input[placeholder*="price" i]'],
        category: ['select[name*="category" i]'],
      },
      submitTexts: ["post", "publish", "list"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    vinted: {
      host: "vinted.com",
      fields: {
        title: ['input[name*="title" i]', 'input[placeholder*="title" i]'],
        description: ['textarea[name*="description" i]', 'textarea[placeholder*="description" i]'],
        price: ['input[name*="price" i]', 'input[placeholder*="price" i]'],
        brand: ['input[name*="brand" i]'],
      },
      submitTexts: ["submit", "post", "list"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    grailed: {
      host: "grailed.com",
      fields: {
        title: ['input[name*="title" i]', 'input[placeholder*="title" i]'],
        description: ['textarea[name*="description" i]', 'textarea[placeholder*="description" i]'],
        price: ['input[name*="price" i]', 'input[placeholder*="price" i]'],
        size: ['select[name*="size" i]', 'input[name*="size" i]'],
        category: ['select[name*="category" i]'],
      },
      submitTexts: ["publish", "list", "post", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      photoInput: ['input[type="file"][accept*="image"]'],
    },
    craigslist: {
      host: "craigslist.org",
      fields: {
        title: ['input[name="PostingTitle"]', 'input#PostingTitle'],
        description: ['textarea[name="PostingBody"]', 'textarea#PostingBody'],
        price: ['input[name="price"]', 'input#price'],
      },
      submitTexts: ["continue", "publish"],
      submit: ['button[value="continue"]', 'button.bigbutton', 'input[type="submit"]'],
      photoInput: ['input[type="file"][name*="file" i]'],
    },
  };

  function getPlatformId() {
    const host = location.hostname;
    for (const [id, config] of Object.entries(PLATFORM_CONFIG)) {
      if (host.includes(config.host)) return id;
    }
    return null;
  }

  function waitForElement(selectors, timeoutMs = 10000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      function probe() {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) return resolve(el);
          } catch {
            continue;
          }
        }
        if (Date.now() >= deadline) return resolve(null);
        setTimeout(probe, 250);
      }
      probe();
    });
  }

  function findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        continue;
      }
    }
    return null;
  }

  function findButtonByText(texts) {
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
    for (const text of texts) {
      const lower = text.toLowerCase();
      const btn = buttons.find((b) => (b.textContent || "").toLowerCase().includes(lower));
      if (btn) return btn;
    }
    return null;
  }

  function simulateTyping(el, value) {
    el.focus();
    el.scrollIntoView({ block: "center" });
    if (el.tagName === "SELECT") {
      const option = Array.from(el.options).find((opt) =>
        opt.text.toLowerCase().includes(String(value).toLowerCase())
      );
      if (option) {
        el.value = option.value;
      }
    } else {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (el.tagName === "INPUT" && nativeInputValueSetter) {
        nativeInputValueSetter.call(el, value);
      } else if (el.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(el, value);
      } else {
        el.value = value;
      }
    }
    const events = ["focus", "click", "keydown", "keypress", "input", "keyup", "change", "blur"];
    for (const type of events) {
      el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    }
    el.blur();
  }

  async function setFilesFromUrls(input, urls) {
    const files = [];
    for (const url of urls.slice(0, 10)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const name = url.split("/").pop() || `photo-${files.length}.jpg`;
        const file = new File([blob], name, { type: blob.type || "image/jpeg" });
        files.push(file);
      } catch (err) {
        console.warn("PostMost: could not fetch photo", url, err);
      }
    }
    if (files.length === 0) return false;

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  async function uploadPhotos(photoUrls, preferredSelectors) {
    const input = findElement(preferredSelectors || []) || findElement([
      'input[type="file"][accept*="image"]',
      'input[type="file"][name*="photo" i]',
      'input[type="file"][name*="image" i]',
      'input[type="file"]',
    ]);
    if (input && photoUrls && photoUrls.length > 0) {
      const ok = await setFilesFromUrls(input, photoUrls);
      if (ok) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async function fillGenericField(label, value) {
    const keywords = label.toLowerCase().split(/\s+/);
    const selectors = keywords.flatMap((kw) => [
      `input[name*="${kw}" i]`,
      `input[id*="${kw}" i]`,
      `input[placeholder*="${kw}" i]`,
      `textarea[name*="${kw}" i]`,
      `textarea[id*="${kw}" i]`,
      `textarea[placeholder*="${kw}" i]`,
      `select[name*="${kw}" i]`,
      `select[id*="${kw}" i]`,
      `[aria-label*="${kw}" i]`,
    ]);
    const el = await waitForElement(selectors, 5000);
    if (el && value !== undefined && value !== null && value !== "") {
      simulateTyping(el, String(value));
    }
    return !!el;
  }

  async function clickSubmit(config) {
    if (config.submitTexts) {
      const btn = findButtonByText(config.submitTexts);
      if (btn) {
        btn.click();
        return true;
      }
    }
    if (config.submit) {
      const btn = await waitForElement(config.submit, 3000);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  async function fillWithConfig(config, listing) {
    const result = { filled: [], missing: [], photos: false };
    for (const [field, selectors] of Object.entries(config.fields)) {
      if (listing[field] === undefined || listing[field] === null || listing[field] === "") continue;
      const el = await waitForElement(selectors, 5000);
      if (el) {
        simulateTyping(el, String(listing[field]));
        result.filled.push(field);
      } else {
        result.missing.push(field);
      }
    }

    if (listing.photos && listing.photos.length > 0) {
      const input = await waitForElement(config.photoInput || ['input[type="file"][accept*="image"]'], 5000);
      if (input) {
        await setFilesFromUrls(input, listing.photos);
        result.photos = true;
      }
    }

    result.submitted = await clickSubmit(config);
    return result;
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
      if (value === undefined || value === null || value === "") continue;
      const ok = await fillGenericField(label, value);
      if (ok) result.filled.push(label);
      else result.missing.push(label);
    }

    if (listing.photos && listing.photos.length > 0) {
      await uploadPhotos(listing.photos, []);
      result.photos = true;
    }

    const submitTexts = ["post", "publish", "list", "submit", "next", "continue"];
    const btn = findButtonByText(submitTexts);
    if (btn) {
      btn.click();
      result.submitted = true;
    }
    return result;
  }

  async function fillListing(listing) {
    const platformId = getPlatformId();
    const config = platformId ? PLATFORM_CONFIG[platformId] : null;
    if (!document.body) {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    const result = config ? await fillWithConfig(config, listing) : await fillGeneric(listing);
    result.platform = platformId || "unknown";
    result.timestamp = Date.now();
    return result;
  }

  window.PostMostFillListing = fillListing;
})();
