/**
 * Generic form-filler for marketplace listing pages.
 * It tries many common selectors and avoids throwing on missing elements.
 */

(function () {
  if (window.PostMostFillListing) return;

  function findInput(selectorGroups) {
    for (const group of selectorGroups) {
      try {
        const el = document.querySelector(group);
        if (el) return el;
      } catch {
        continue;
      }
    }
    return null;
  }

  function setValue(el, value) {
    if (!el) return;
    el.focus();
    if (el.tagName === "SELECT") {
      const option = Array.from(el.options).find((opt) =>
        opt.text.toLowerCase().includes(String(value).toLowerCase())
      );
      if (option) el.value = option.value;
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  function fillField(labelKeywords, value) {
    const selectors = labelKeywords.flatMap((kw) => [
      `input[name*="${kw}" i]`,
      `input[id*="${kw}" i]`,
      `input[placeholder*="${kw}" i]`,
      `textarea[name*="${kw}" i]`,
      `textarea[id*="${kw}" i]`,
      `textarea[placeholder*="${kw}" i]`,
      `select[name*="${kw}" i]`,
      `select[id*="${kw}" i]`,
    ]);
    const el = findInput(selectors);
    if (el) setValue(el, value);
  }

  async function setFilesFromUrls(input, urls) {
    const files = [];
    for (const url of urls.slice(0, 10)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const name = url.split("/").pop() || "photo.jpg";
        const file = new File([blob], name, { type: blob.type || "image/jpeg" });
        files.push(file);
      } catch (err) {
        console.warn("PostMost: could not fetch photo", url, err);
      }
    }
    if (files.length === 0) return;

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function uploadPhotos(photoUrls) {
    const input = findInput([
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="image/*"]',
      'input[type="file"][name*="photo" i]',
      'input[type="file"][name*="image" i]',
      'input[type="file"]',
    ]);
    if (input && photoUrls && photoUrls.length > 0) {
      await setFilesFromUrls(input, photoUrls);
    }
  }

  function findButtonByText(texts) {
    const buttons = Array.from(document.querySelectorAll("button, input[type=\"button\"], input[type=\"submit\"], a[role=\"button\"]"));
    for (const text of texts) {
      const lower = text.toLowerCase();
      const btn = buttons.find((b) => (b.textContent || "").toLowerCase().includes(lower));
      if (btn) return btn;
    }
    return document.querySelector('button[type="submit"]');
  }

  async function submitForm() {
    const submit = findButtonByText(["post", "publish", "list", "submit", "next", "continue"]);
    if (submit) {
      submit.click();
      return true;
    }
    return false;
  }

  async function fillListing(listing) {
    fillField(["title"], listing.title);
    fillField(["price"], String(listing.price));
    fillField(["description"], listing.description);
    fillField(["condition"], listing.condition);
    fillField(["brand"], listing.brand || "");
    fillField(["size"], listing.size || "");
    fillField(["color"], listing.color || "");
    fillField(["material"], listing.material || "");

    if (listing.photos && listing.photos.length > 0) {
      await uploadPhotos(listing.photos);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    return submitForm();
  }

  window.PostMostFillListing = fillListing;
})();
