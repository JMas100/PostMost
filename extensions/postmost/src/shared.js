(function () {
  "use strict";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function waitForElement(selectors, timeoutMs = 10000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      function probe() {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el && isVisible(el)) return resolve(el);
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
        if (el && isVisible(el)) return el;
      } catch {
        continue;
      }
    }
    return null;
  }

  function findElements(selectors) {
    for (const sel of selectors) {
      try {
        const list = Array.from(document.querySelectorAll(sel)).filter(isVisible);
        if (list.length) return list;
      } catch {
        continue;
      }
    }
    return [];
  }

  function findButtonByText(texts) {
    const buttons = Array.from(
      document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"], [role="button"]')
    );
    for (const text of texts) {
      const lower = text.toLowerCase();
      const btn = buttons.find((b) => (b.textContent || "").toLowerCase().includes(lower));
      if (btn) return btn;
    }
    return null;
  }

  function dispatchEvents(el, types) {
    for (const type of types) {
      el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    }
  }

  function setNativeValue(el, value) {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;

    if (el.tagName === "INPUT" && inputSetter) {
      inputSetter.call(el, value);
    } else if (el.tagName === "TEXTAREA" && textareaSetter) {
      textareaSetter.call(el, value);
    } else if (el.tagName === "SELECT" && selectSetter) {
      selectSetter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function setReactValue(el, value) {
    try {
      const setter = Object.getOwnPropertyDescriptor(el.__proto__, "value")?.set;
      if (setter) setter.call(el, value);
      else setNativeValue(el, value);
    } catch {
      setNativeValue(el, value);
    }
  }

  function simulateTyping(el, value) {
    if (!el) return false;
    el.focus();
    el.scrollIntoView({ block: "center", behavior: "instant" });

    if (el.isContentEditable) {
      el.textContent = String(value);
      dispatchEvents(el, ["focus", "click", "keydown", "keypress", "input", "keyup", "change", "blur"]);
      el.blur();
      return true;
    }

    if (el.tagName === "SELECT") {
      const options = Array.from(el.options);
      const valueStr = String(value).toLowerCase();
      const option = options.find((opt) =>
        (opt.text || "").toLowerCase().includes(valueStr) ||
        (opt.value || "").toLowerCase().includes(valueStr)
      );
      if (option) {
        setNativeValue(el, option.value);
      }
    } else {
      setReactValue(el, String(value));
    }

    dispatchEvents(el, ["focus", "click", "keydown", "keypress", "input", "keyup", "change", "blur"]);
    el.blur();
    return true;
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function fetchBlob(url) {
    if (url.startsWith("data:")) return dataUrlToBlob(url);
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }

  async function setFilesFromUrls(input, urls) {
    const files = [];
    for (const url of urls.slice(0, 10)) {
      try {
        const blob = await fetchBlob(url);
        const name = url.startsWith("data:")
          ? `photo-${files.length}.jpg`
          : url.split("/").pop() || `photo-${files.length}.jpg`;
        const ext = name.split(".").pop() || "jpg";
        const fileName = name.includes(".") ? name : `photo-${files.length}.${ext}`;
        const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
        files.push(file);
      } catch (err) {
        console.warn("PostMost: could not fetch photo", url, err);
      }
    }
    if (files.length === 0) return false;

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    dispatchEvents(input, ["change", "input"]);
    return true;
  }

  async function uploadPhotos(photoUrls, preferredSelectors) {
    if (!photoUrls || photoUrls.length === 0) return false;
    const input =
      findElement(preferredSelectors || []) ||
      findElement([
        'input[type="file"][accept*="image"]',
        'input[type="file"][name*="photo" i]',
        'input[type="file"][name*="image" i]',
        'input[type="file"]',
      ]);
    if (!input) return false;
    const ok = await setFilesFromUrls(input, photoUrls);
    if (ok) await sleep(1200);
    return ok;
  }

  window.PostMostUtils = {
    sleep,
    isVisible,
    waitForElement,
    findElement,
    findElements,
    findButtonByText,
    simulateTyping,
    dispatchEvents,
    uploadPhotos,
  };
})();
