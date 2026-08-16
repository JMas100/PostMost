(function () {
  "use strict";
  const utils = window.PostMostUtils || {};

  const commonEvents = ["focus", "click", "keydown", "keypress", "input", "keyup", "change", "blur"];

  function fillField(label, value, selectors, result, timeout = 7000) {
    if (value === undefined || value === null || value === "") return false;
    const el = utils.findElement(selectors) || utils.waitForElement(selectors, timeout);
    if (!el) {
      result.missing.push(label);
      return false;
    }
    utils.simulateTyping(el, String(value));
    result.filled.push(label);
    return true;
  }

  function standardFill(listing, config, result) {
    for (const [field, selectors] of Object.entries(config.fields || {})) {
      const value = listing[field];
      if (value === undefined || value === null || value === "") continue;
      fillField(field, value, selectors, result, config.fieldTimeout || 7000);
    }
  }

  async function standardUpload(listing, config, result) {
    if (listing.photos && listing.photos.length > 0) {
      result.photos = await utils.uploadPhotos(listing.photos, config.photoInput);
    }
  }

  async function standardSubmit(config, result) {
    await utils.sleep(config.submitDelay || 500);
    if (config.submitTexts) {
      const btn = utils.findButtonByText(config.submitTexts);
      if (btn) {
        btn.click();
        result.submitted = true;
        return;
      }
    }
    if (config.submit) {
      const btn = await utils.waitForElement(config.submit, 4000);
      if (btn) {
        btn.click();
        result.submitted = true;
        return;
      }
    }
    result.submitted = false;
  }

  const PLATFORMS = {
    facebook: {
      host: "facebook.com",
      paths: ["/marketplace/create"],
      fields: {
        title: [
          '[aria-label*="title" i]',
          'input[placeholder*="title" i]',
          '[role="dialog"] input[type="text"]',
          '[contenteditable="true"][aria-label*="title" i]',
        ],
        price: [
          '[aria-label*="price" i]',
          'input[placeholder*="price" i]',
          'input[role="spinbutton"]',
        ],
        description: [
          '[aria-label*="description" i]',
          'textarea[placeholder*="description" i]',
          '[contenteditable="true"][aria-label*="description" i]',
          '[role="dialog"] textarea',
        ],
        category: [
          '[aria-label*="category" i]',
          '[role="combobox"][aria-label*="category" i]',
          'input[placeholder*="category" i]',
        ],
        condition: [
          '[aria-label*="condition" i]',
          '[role="combobox"][aria-label*="condition" i]',
          'input[placeholder*="condition" i]',
        ],
      },
      photoInput: [
        'input[type="file"][accept*="image"]',
        '[aria-label*="photo" i]',
      ],
      submitTexts: ["next", "post"],
      submit: ['button[type="submit"]', '[aria-label*="post" i]', '[aria-label*="next" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    offerup: {
      host: "offerup.com",
      paths: ["/item/new"],
      fields: {
        title: [
          'input[name="title"]',
          'input[id*="title" i]',
          'input[placeholder*="title" i]',
          'input[placeholder*="What are you" i]',
        ],
        price: [
          'input[name="price"]',
          'input[id*="price" i]',
          'input[placeholder*="price" i]',
          'input[type="number"]',
        ],
        description: [
          'textarea[name="description"]',
          'textarea[id*="description" i]',
          'textarea[placeholder*="description" i]',
        ],
        condition: [
          'select[name*="condition" i]',
          'input[name*="condition" i]',
          '[role="button"][aria-label*="condition" i]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
          '[role="button"][aria-label*="category" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["post", "publish", "list", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]', 'button[aria-label*="post" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    poshmark: {
      host: "poshmark.com",
      paths: ["/create-listing"],
      fields: {
        title: [
          'input[name="listing[title]"]',
          'input[placeholder*="title" i]',
          'input[id*="title" i]',
          'input[data-testid*="title" i]',
        ],
        description: [
          'textarea[name="listing[description]"]',
          'textarea[placeholder*="description" i]',
          'textarea[id*="description" i]',
        ],
        price: [
          'input[name="listing[price]"]',
          'input[placeholder*="price" i]',
          'input[id*="price" i]',
        ],
        size: [
          'select[name*="size" i]',
          'input[name*="size" i]',
          'input[placeholder*="size" i]',
        ],
        brand: [
          'input[name*="brand" i]',
          'input[placeholder*="brand" i]',
        ],
        color: [
          'input[name*="color" i]',
          'input[placeholder*="color" i]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
          'input[placeholder*="category" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["next", "list", "submit", "post"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    mercari: {
      host: "mercari.com",
      paths: ["/sell/", "/sell"],
      fields: {
        title: [
          'input[name*="name" i]',
          'input[placeholder*="What are you selling" i]',
          'input[placeholder*="title" i]',
        ],
        description: [
          'textarea[name*="description" i]',
          'textarea[placeholder*="description" i]',
        ],
        price: [
          'input[name*="price" i]',
          'input[placeholder*="price" i]',
          'input[type="number"]',
        ],
        condition: [
          'select[name*="condition" i]',
          'input[name*="condition" i]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
        ],
        brand: [
          'input[name*="brand" i]',
          'input[placeholder*="brand" i]',
        ],
        color: [
          'input[name*="color" i]',
          'input[placeholder*="color" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["list", "sell", "post", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    depop: {
      host: "depop.com",
      paths: ["/products/create"],
      fields: {
        title: [
          'input[name*="title" i]',
          'input[placeholder*="title" i]',
          'input[id*="title" i]',
        ],
        description: [
          'textarea[name*="description" i]',
          'textarea[placeholder*="description" i]',
          'textarea[id*="description" i]',
        ],
        price: [
          'input[name*="price" i]',
          'input[placeholder*="price" i]',
          'input[type="number"]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
          'input[placeholder*="category" i]',
        ],
        condition: [
          'select[name*="condition" i]',
          'input[name*="condition" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["post", "publish", "list"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    vinted: {
      host: "vinted.com",
      paths: ["/items/new"],
      fields: {
        title: [
          'input[name*="title" i]',
          'input[placeholder*="title" i]',
          'input[id*="title" i]',
        ],
        description: [
          'textarea[name*="description" i]',
          'textarea[placeholder*="description" i]',
        ],
        price: [
          'input[name*="price" i]',
          'input[placeholder*="price" i]',
          'input[type="number"]',
        ],
        brand: [
          'input[name*="brand" i]',
          'input[placeholder*="brand" i]',
        ],
        size: [
          'select[name*="size" i]',
          'input[name*="size" i]',
          'input[placeholder*="size" i]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["submit", "post", "list"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    grailed: {
      host: "grailed.com",
      paths: ["/sell/new"],
      fields: {
        title: [
          'input[name*="title" i]',
          'input[placeholder*="title" i]',
          'input[id*="title" i]',
        ],
        description: [
          'textarea[name*="description" i]',
          'textarea[placeholder*="description" i]',
          'textarea[id*="description" i]',
        ],
        price: [
          'input[name*="price" i]',
          'input[placeholder*="price" i]',
          'input[type="number"]',
        ],
        size: [
          'select[name*="size" i]',
          'input[name*="size" i]',
          'input[placeholder*="size" i]',
        ],
        category: [
          'select[name*="category" i]',
          'input[name*="category" i]',
        ],
      },
      photoInput: ['input[type="file"][accept*="image"]', 'input[type="file"][name*="image" i]'],
      submitTexts: ["publish", "list", "post", "submit"],
      submit: ['button[type="submit"]', 'button[id*="submit" i]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    craigslist: {
      host: "craigslist.org",
      paths: ["/post.craigslist.org"],
      fields: {
        title: ['input[name="PostingTitle"]', 'input#PostingTitle', 'input[placeholder*="title" i]'],
        description: ['textarea[name="PostingBody"]', 'textarea#PostingBody', 'textarea[placeholder*="description" i]'],
        price: ['input[name="price"]', 'input#price', 'input[placeholder*="price" i]'],
      },
      photoInput: ['input[type="file"][name*="file" i]', 'input[type="file"][accept*="image"]'],
      submitTexts: ["continue", "publish", "post"],
      submit: ['button[value="continue"]', 'button.bigbutton', 'input[type="submit"]', 'button[type="submit"]'],
      async fill(listing, result) {
        standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },
  };

  window.PostMostPlatforms = PLATFORMS;
})();
