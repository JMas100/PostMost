(function () {
  "use strict";
  const utils = window.PostMostUtils || {};

  const commonEvents = ["focus", "click", "keydown", "keypress", "input", "keyup", "change", "blur"];

  async function fillField(label, value, selectors, result, timeout = 7000) {
    if (value === undefined || value === null || value === "") return false;
    // Was missing `await` here -- utils.findElement() only checks the DOM synchronously, so on a
    // miss this fell through to the *unawaited* waitForElement() Promise itself (always truthy),
    // then called simulateTyping() on that Promise object and threw, aborting the whole fill the
    // moment any field wasn't already on the page at call time.
    const el = utils.findElement(selectors) || (await utils.waitForElement(selectors, timeout));
    if (!el) {
      result.missing.push(label);
      return false;
    }
    utils.simulateTyping(el, String(value));
    result.filled.push(label);
    return true;
  }

  // True only when a <select>'s options actually contain something matching this value -- unlike
  // simulateTyping() itself, which reports success unconditionally even when nothing matched (it
  // just leaves the select's value untouched). Always true for a non-<select> element, since a
  // plain text/textarea field has no fixed set of options to match against.
  function optionMatched(el, value) {
    if (!el || el.tagName !== "SELECT" || value === undefined || value === null || value === "") return true;
    const valueStr = String(value).toLowerCase();
    return Array.from(el.options).some(
      (opt) => (opt.text || "").toLowerCase().includes(valueStr) || (opt.value || "").toLowerCase().includes(valueStr)
    );
  }

  // PostMost's own `category` is a broad 9-bucket field; `categoryDetail` is an optional, more
  // specific term a seller can add ("Fins" vs. "Sports"). A real <select>'s options are often just
  // as broad as the bucket, so the specific term won't always match one -- try it first since it's
  // strictly better when it does, but fall back to the broad bucket (the value this already used
  // to fill with, before categoryDetail existed) rather than leaving the field on a silent miss.
  async function fillCategoryField(listing, selectors, result, timeout) {
    const detail = listing.categoryDetail;
    const broad = listing.category;
    if (!detail && !broad) return;

    const el = utils.findElement(selectors) || (await utils.waitForElement(selectors, timeout));
    if (!el) {
      result.missing.push("category");
      return;
    }

    if (detail) {
      utils.simulateTyping(el, String(detail));
      if (optionMatched(el, detail)) {
        result.filled.push("category");
        return;
      }
    }
    if (broad) utils.simulateTyping(el, String(broad));
    result.filled.push("category");
  }

  async function standardFill(listing, config, result) {
    for (const [field, selectors] of Object.entries(config.fields || {})) {
      if (field === "category") {
        await fillCategoryField(listing, selectors, result, config.fieldTimeout || 7000);
        continue;
      }
      const value = listing[field];
      if (value === undefined || value === null || value === "") continue;
      await fillField(field, value, selectors, result, config.fieldTimeout || 7000);
    }
  }

  async function standardUpload(listing, config, result) {
    if (listing.photos && listing.photos.length > 0) {
      result.photos = await utils.uploadPhotos(listing.photos, config.photoInput);
      if (result.photos) result.filled.push("photos");
      else result.missing.push("photos");
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

  // OfferUp doesn't have a listing-creation page at all -- "/item/new" ("Sorry, this page does
  // not exist") was confirmed dead by direct manual navigation. The real form only exists as a
  // modal opened from the site header ("Post" -> "Sell an item"), so unlike every other platform
  // here, filling OfferUp means driving that open-modal click sequence first. All of the
  // selectors below came from a real, human-paced walk through OfferUp's own UI (per this repo's
  // hard rule against scripted reconnaissance against a live marketplace session), not guesswork.

  async function offerUpFillField(label, value, selectors, result, timeout = 8000) {
    if (value === undefined || value === null || value === "") return;
    const el = utils.findElement(selectors) || (await utils.waitForElement(selectors, timeout));
    if (!el) {
      result.missing.push(label);
      return;
    }
    utils.simulateTyping(el, String(value));
    result.filled.push(label);
  }

  async function offerUpOpenPostForm(result) {
    if (utils.findElement(['[data-testid="PostItemForm"]'])) return true;

    const postBtn = await utils.waitForElement(['[data-testid="HeaderRedesignRightCluster.Post.Button"]'], 8000);
    if (!postBtn) {
      result.missing.push("open post form");
      return false;
    }
    postBtn.click();

    // A "Sell an item" / "Post a job" menu appears between the header button and the actual
    // form -- only click through it if it shows up, since some layouts may open the form directly.
    const sellItem = await utils.waitForElement(['[data-testid="HeaderRedesignRightCluster.Post.sellItem"]'], 3000);
    if (sellItem) sellItem.click();

    const modal = await utils.waitForElement(['[data-testid="PostItemForm"]'], 8000);
    if (!modal) {
      result.missing.push("open post form");
      return false;
    }
    return true;
  }

  // OfferUp's category tree is 1-2 levels deep with no stable testids below the top-level field,
  // just button text -- there's no full taxonomy crosswalk from PostMost's own category field, so
  // this only commits to a category when the listing's own category text actually matches
  // something in the picker (at either level), and otherwise leaves it for manual selection
  // rather than guessing and risking a wrong/misleading category.
  async function offerUpPickCategory(listing, result) {
    if (!listing.category) return;
    const trigger = utils.findElement([
      '[data-testid="PostItemForm.CategoryField"] button',
      '[data-testid="PostItemForm.CategoryField"]',
    ]);
    if (!trigger) {
      result.missing.push("category (pick manually)");
      return;
    }
    trigger.click();
    await utils.sleep(400);

    const firstLevel = utils.findButtonByText([listing.category]);
    if (!firstLevel) {
      result.missing.push("category (pick manually)");
      return;
    }
    firstLevel.click();
    result.filled.push(`category (picked "${(firstLevel.textContent || "").trim()}")`);

    // Some categories open a second-level submenu after this click (e.g. "Tickets" -> its own
    // subcategories). PostMost's broad category bucket ("Sports", "Clothing", ...) has no real
    // text overlap with OfferUp's specific subcategory names ("Fins", "Kayaks", ...) -- re-
    // matching that same broad text here doesn't find the right subcategory, it just finds
    // *something* containing that word wherever it happens to appear on the page (confirmed
    // live: a "Sports" listing landed in an unrelated Baby subcategory this way). categoryDetail
    // is the seller-supplied specific term meant for exactly this -- only attempt a subcategory
    // pick when it's actually present, and only commit to it on a real text match.
    if (listing.categoryDetail) {
      await utils.sleep(400);
      const secondLevel = utils.findButtonByText([listing.categoryDetail]);
      if (secondLevel) {
        secondLevel.click();
        result.filled.push(`category subcategory (picked "${(secondLevel.textContent || "").trim()}")`);
        return;
      }
    }
    result.missing.push("category subcategory (pick manually if OfferUp asks for one)");
  }

  const OFFERUP_CONDITION_MAP = {
    "new with tags": "NEW",
    "new without tags": "OPEN_BOX",
    "like new": "OPEN_BOX",
    good: "USED",
    fair: "USED",
    poor: "USED",
  };

  function offerUpPickCondition(listing, result) {
    if (!listing.condition) return;
    const testId = OFFERUP_CONDITION_MAP[String(listing.condition).toLowerCase().trim()];
    const btn = testId ? utils.findElement([`[data-testid="PostItemForm.ConditionField.${testId}"]`]) : null;
    if (btn) {
      btn.click();
      result.filled.push("condition");
    } else {
      result.missing.push("condition (pick manually)");
    }
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
        await standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },

    offerup: {
      host: "offerup.com",
      paths: ["/"],
      async fill(listing, result) {
        const opened = await offerUpOpenPostForm(result);
        if (!opened) return;

        await offerUpFillField(
          "title",
          listing.title,
          ['[data-testid="PostItemForm"] input[name="title"]', 'input[name="title"]'],
          result
        );
        await offerUpFillField(
          "description",
          listing.description,
          ['[data-testid="PostItemForm"] textarea[name="description"]', 'textarea[name="description"]'],
          result
        );
        await offerUpFillField(
          "price",
          listing.price,
          ['[data-testid="PostItemForm"] input[name="price"]', 'input[name="price"]'],
          result
        );

        if (listing.photos && listing.photos.length > 0) {
          // Confirmed by real inspection: the input has no id/name/testid, just this exact
          // accept list, and is visually hidden behind a styled "Add photos" button.
          result.photos = await utils.uploadPhotos(listing.photos, [
            'input[type="file"][accept="image/jpeg,image/png,image/webp"]',
            'input[type="file"][accept*="image/jpeg"]',
          ]);
          if (result.photos) result.filled.push("photos");
          else result.missing.push("photos (add manually)");
        }

        await offerUpPickCategory(listing, result);
        offerUpPickCondition(listing, result);

        // No reliable source for the seller's real zip code in the listing data, and OfferUp
        // requires Location before a listing can actually post -- leave that field, and the final
        // review/submit, to the seller instead of guessing or auto-submitting an incomplete form.
        result.missing.push("location (enter your zip code, then review and click Post item)");
        result.submitted = false;
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
        await standardFill(listing, this, result);
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
        await standardFill(listing, this, result);
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
        await standardFill(listing, this, result);
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
        await standardFill(listing, this, result);
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
        await standardFill(listing, this, result);
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
        await standardFill(listing, this, result);
        await standardUpload(listing, this, result);
        await standardSubmit(this, result);
      },
    },
  };

  window.PostMostPlatforms = PLATFORMS;
})();
