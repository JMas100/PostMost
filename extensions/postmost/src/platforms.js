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

  // PostMost category -> OfferUp's real top-level category text, confirmed live via OfferUp's own
  // "Select a category" picker (its full list, pasted directly): "Electronics & Media", "Home &
  // Garden", "Clothing, Shoes, & Accessories", "Baby & Kids", "Vehicles", "Toys, Games, &
  // Hobbies", "Sports & Outdoors", "Collectibles & Art", "Pet supplies", "Health & Beauty",
  // "Wedding", "Business equipment", "Tickets", "General". An explicit crosswalk now that both
  // sides are fully known, rather than relying on fuzzy text matching alone -- covers the cases
  // where wording only differs cosmetically (an extra comma) and the cases where it diverges on
  // purpose (PostMost keeps "Vintage" over OfferUp's "Art" since it matters more to resellers;
  // "Other" reads clearer to a seller than OfferUp's own catch-all name "General").
  const OFFERUP_CATEGORY_MAP = {
    "clothing, shoes, & accessories": "Clothing, Shoes, & Accessories",
    electronics: "Electronics & Media",
    "home & garden": "Home & Garden",
    "sports & outdoors": "Sports & Outdoors",
    "toys, games, & hobbies": "Toys, Games, & Hobbies",
    "baby & kids": "Baby & Kids",
    "books, movies & music": "Electronics & Media",
    "collectibles & vintage": "Collectibles & Art",
    "pet supplies": "Pet supplies",
    "health & beauty": "Health & Beauty",
    "tickets & experiences": "Tickets",
    "vehicles & parts": "Vehicles",
    other: "General",
  };

  // "Books, Movies & Music" is a PostMost top-level category that maps onto a *subcategory*
  // nested under a different OfferUp top-level category -- confirmed live: "Books, Movies, &
  // Music" is one of OfferUp's real subcategories under "Electronics & Media", not a top-level
  // category of its own. Unambiguous regardless of what's picked underneath it in PostMost, so no
  // lookup needed -- it's always this one value.
  const OFFERUP_ALWAYS_SUBCATEGORY = {
    "books, movies & music": "Books, Movies, & Music",
  };

  // Below the top level, PostMost's own taxonomy (lib/category-taxonomy.ts) was authored directly
  // from OfferUp's real category tree -- gathered live, level by level, for every category except
  // Health & Beauty and Tickets & Experiences (no deep tree gathered for those two yet). So unlike
  // the old free-text categoryDetail field, categoryDetail and categoryPath now generally *are*
  // OfferUp's own real subcategory text already -- a highly specific compound phrase like "Cell
  // Phones & Accessories" or "Bluetooth Speakers" is safe to search for globally (unlike a bare
  // word like "Fins"/"Sports", which is what caused wrong clicks into unrelated categories
  // before). No per-node crosswalk table needed for most of the tree; this just walks the picks in
  // order and clicks through each real menu level as it opens, stopping cleanly -- reporting
  // whatever's left as missing/manual -- the moment a level doesn't find a match or the seller's
  // own picks run out (e.g. they stopped at Subcategory, or picked a level OfferUp's site doesn't
  // actually have, like "TV, Audio & Video" where OfferUp really splits that into two).
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

    const categoryKey = String(listing.category).toLowerCase().trim();
    const mapped = OFFERUP_CATEGORY_MAP[categoryKey];
    const firstLevel = utils.findButtonByText(mapped ? [mapped, listing.category] : [listing.category]);
    if (!firstLevel) {
      result.missing.push("category (pick manually)");
      return;
    }
    firstLevel.click();
    result.filled.push(`category (picked "${(firstLevel.textContent || "").trim()}")`);

    const always = OFFERUP_ALWAYS_SUBCATEGORY[categoryKey];
    const wanted = [always, listing.categoryDetail, ...(listing.categoryPath || [])].filter(Boolean);
    for (const target of wanted) {
      await utils.sleep(400);
      const el = utils.findButtonByText([target]);
      if (!el) break;
      el.click();
      result.filled.push(`category subcategory (picked "${target}")`);
    }
    // Always left as a reminder, even when every pick was found and clicked -- there's no way to
    // know from here whether the deepest node reached is a real leaf on OfferUp's own tree or
    // still wants a further pick (matches OfferUp's own behavior seen live: it can still prompt to
    // finish a category even after several correct clicks).
    result.missing.push("category subcategory (pick manually if OfferUp asks for one)");
  }

  // Poshmark's real create-listing form is a Vue app with vee-validate data-vv-name attributes,
  // and Category/Condition are custom click-to-open dropdowns, not real <select> elements -- the
  // generic fields/standardFill approach never actually matched anything real here. These
  // selectors are ported from the old server-side Playwright automation (lib/marketplaces/
  // adapters/poshmark.ts), which was verified live against a real account before being retired
  // for the unrelated reason of unattended headless automation being unsafe -- the DOM knowledge
  // itself is still accurate and doesn't need to be re-derived from scratch the way OfferUp did.
  const POSHMARK_CATEGORY_DIRECT_MAP = { electronics: "electronics", home: "home", toys: "kids" };
  const POSHMARK_AUDIENCE_MAP = { women: "women", men: "men", kids: "kids", pets: "pets" };
  const POSHMARK_AUDIENCE_KEYWORDS = [
    { slug: "women", keywords: ["women", "woman", "womens", "ladies", "her", "hers", "girl", "girls"] },
    { slug: "men", keywords: ["men", "man", "mens", "menswear", "his", "guy", "guys", "boy", "boys"] },
    { slug: "kids", keywords: ["kid", "kids", "child", "children", "baby", "toddler", "youth", "infant"] },
    { slug: "pets", keywords: ["pet", "pets", "dog", "cat", "puppy", "kitten"] },
  ];

  function includesWord(haystack, word) {
    return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
  }

  // Mirrors matchPoshmarkCategory() in lib/marketplaces/adapters/poshmark-validation.ts. Returns
  // null (instead of throwing, like the server-side version) when nothing matches -- Poshmark
  // marks this required with a hard asterisk, so an unresolved category is left for manual pick
  // rather than guessed.
  function matchPoshmarkCategorySlug(listing) {
    const direct = POSHMARK_CATEGORY_DIRECT_MAP[String(listing.category || "").toLowerCase()];
    if (direct) return direct;
    const audienceMatch = listing.audience ? POSHMARK_AUDIENCE_MAP[String(listing.audience).toLowerCase()] : undefined;
    if (audienceMatch) return audienceMatch;
    const haystack = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();
    for (const { slug, keywords } of POSHMARK_AUDIENCE_KEYWORDS) {
      if (keywords.some((kw) => includesWord(haystack, kw))) return slug;
    }
    return null;
  }

  const POSHMARK_CONDITION_MATCHERS = [
    { code: "nwt", keywords: ["new with tags", "nwt", "brand new", "new"] },
    { code: "uln", keywords: ["like new", "excellent"] },
    { code: "ug", keywords: ["good"] },
    { code: "uf", keywords: ["fair", "used", "poor", "worn"] },
  ];

  function matchPoshmarkConditionCode(listing) {
    const haystack = String(listing.condition || "").toLowerCase();
    for (const { code, keywords } of POSHMARK_CONDITION_MATCHERS) {
      if (keywords.some((kw) => haystack.includes(kw))) return code;
    }
    return "ug";
  }

  async function poshmarkDismissStartupModals() {
    const errorDialog = Array.from(document.querySelectorAll('div[data-test="modal-container"]')).find((el) =>
      (el.textContent || "").includes("Sorry! You cannot currently perform this request")
    );
    if (errorDialog) {
      const btn = errorDialog.querySelector("button");
      if (btn) {
        btn.click();
        await utils.sleep(300);
      }
    }
    const cookieBtn = document.querySelector(".cookie-banner button");
    if (cookieBtn && utils.isVisible(cookieBtn)) {
      cookieBtn.click();
      await utils.sleep(200);
    }
  }

  // Poshmark opens a crop/confirm modal after each individual photo upload that sits on top of
  // the page until dismissed -- the real image processing that triggers it is async and can take
  // several seconds, so this polls rather than checking once.
  async function poshmarkDismissCropModalIfOpen(timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const applyBtn = Array.from(document.querySelectorAll('div[data-test="modal-container"] button')).find(
        (b) => (b.textContent || "").trim().toLowerCase() === "apply" && utils.isVisible(b)
      );
      if (applyBtn) {
        applyBtn.click();
        await utils.sleep(300);
        return true;
      }
      await utils.sleep(300);
    }
    return false;
  }

  async function poshmarkUploadPhotos(listing, result) {
    if (!listing.photos || listing.photos.length === 0) return;
    const input = utils.findFileInput(["#img-file-input"]);
    if (!input) {
      result.missing.push("photos (add manually)");
      return;
    }
    let uploaded = 0;
    for (let i = 0; i < Math.min(listing.photos.length, 16); i++) {
      const ok = await utils.uploadSinglePhoto(input, listing.photos[i], i);
      if (!ok) break;
      uploaded++;
      await poshmarkDismissCropModalIfOpen();
    }
    result.photos = uploaded > 0;
    if (uploaded > 0) result.filled.push("photos");
    else result.missing.push("photos (add manually)");
  }

  async function poshmarkPickCategory(listing, result) {
    const slug = matchPoshmarkCategorySlug(listing);
    if (!slug) {
      result.missing.push('category (Poshmark requires Women/Men/Kids/Home/Pets/Electronics -- set "Who\'s it for?" on the listing, or pick manually)');
      return;
    }
    await poshmarkDismissCropModalIfOpen(1500);
    const dropdown = utils.findElement(['.listing-editor__category-container [data-test="dropdown"]']);
    if (!dropdown) {
      result.missing.push("category (pick manually)");
      return;
    }
    dropdown.click();
    await utils.sleep(300);
    const topLevel = await utils.waitForElement([`.listing-editor__category-container a[data-et-name="${slug}"]`], 3000);
    if (!topLevel) {
      result.missing.push("category (pick manually)");
      return;
    }
    topLevel.click();
    await utils.sleep(500);
    // The top-level click only drills into a second-level list -- it doesn't finalize Category by
    // itself. Second-level items carry no stable attribute, only visible text; "Other" is always
    // present as a catch-all and was confirmed live to both finalize Category *and* auto-default
    // Size to "OS", sidestepping needing a real size-taxonomy mapping -- same known trade-off
    // (every listing lands under .../Other, not a more specific subcategory) as the retired
    // server automation this is ported from.
    const secondLevel = Array.from(document.querySelectorAll(".listing-editor__category-container *")).find(
      (el) => el.children.length === 0 && (el.textContent || "").trim() === "Other"
    );
    if (secondLevel) {
      secondLevel.click();
      await utils.sleep(500);
    }
    // This dropdown doesn't reliably close itself after a selection -- a leftover open menu can
    // intercept the next click (Condition). Clicking a neutral, always-present target forces it
    // closed the same way a real user clicking elsewhere would.
    const heading = utils.findElement(["h1"]);
    if (heading) heading.click();
    await utils.sleep(200);
    result.filled.push(secondLevel ? `category (${slug}/Other)` : `category (${slug})`);
  }

  async function poshmarkPickCondition(listing, result) {
    const code = matchPoshmarkConditionCode(listing);
    const dropdown = utils.findElement(['.listing-editor__condition-container [data-test="dropdown"]']);
    if (!dropdown) {
      result.missing.push("condition (pick manually)");
      return;
    }
    dropdown.click();
    await utils.sleep(300);
    const option = await utils.waitForElement([`.listing-editor__condition-container div[data-et-prop-content="${code}"]`], 3000);
    if (option) {
      option.click();
      result.filled.push("condition");
    } else {
      result.missing.push("condition (pick manually)");
    }
  }

  async function poshmarkFillPrice(listing, result) {
    if (listing.price === undefined || listing.price === null || listing.price === "") return;
    const priceField = utils.findElement(['input[data-vv-name="listingPrice"]']);
    if (!priceField) {
      result.missing.push("price (pick manually)");
      return;
    }
    priceField.click();
    const modalInput = await utils.waitForElement(["#listing-price-modal-listing-price-input"], 5000);
    if (!modalInput) {
      result.missing.push("price (pick manually)");
      return;
    }
    utils.simulateTyping(modalInput, String(Math.round(Number(listing.price))));

    // Smart Sell defaults ON inside this modal and requires its own Minimum Price field with no
    // real minimum-price business logic behind it -- turn it off rather than leave a second
    // required field unset.
    const smartSellToggle = utils.findElement(['[data-test="toggle-input"]']);
    if (smartSellToggle && smartSellToggle.checked) {
      const label = utils.findElement(['label[data-test="toggle-switch"]']);
      if (label) label.click();
    }
    await utils.sleep(300);

    const doneBtn = utils.findButtonByText(["Done"]);
    if (doneBtn) doneBtn.click();
    result.filled.push("price");
  }

  // Facebook Marketplace's real create-listing form (verified live, real DOM captures) has no
  // stable name/id attributes on Title/Price/Description -- their `id`s are React-generated and
  // change every page load. Each is wrapped in a <label> alongside a plain-text span naming the
  // field ("Title", "Price", "Description"), which is stable, so fields are found by that label
  // text instead. Category and Condition are role="combobox" elements that open a flat, single-
  // click list of real, specific option text (e.g. "Furniture", "Used - Like New") when clicked --
  // no multi-level drill-down like Poshmark/OfferUp. It's also a 3-step wizard (item details ->
  // delivery method -> list in more places); steps 2 and 3 need nothing touched -- Facebook
  // pre-fills Location from the seller's own profile, defaults Delivery method to "Local pickup
  // only", and checks "List publicly to Marketplace" by default, with groups left optional.

  function findFacebookFieldByLabel(labelText, tagName) {
    const labels = Array.from(document.querySelectorAll("label"));
    const label = labels.find((l) => (l.textContent || "").trim().startsWith(labelText));
    return label ? label.querySelector(tagName) : null;
  }

  async function waitForFacebookFieldByLabel(labelText, tagName, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const field = findFacebookFieldByLabel(labelText, tagName);
      if (field && utils.isVisible(field)) return field;
      await utils.sleep(250);
    }
    return null;
  }

  function findFacebookComboboxByLabel(labelText) {
    const labels = Array.from(document.querySelectorAll('label[role="combobox"]'));
    return labels.find((l) => (l.textContent || "").trim().startsWith(labelText)) || null;
  }

  async function waitForFacebookComboboxByLabel(labelText, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const el = findFacebookComboboxByLabel(labelText);
      if (el && utils.isVisible(el)) return el;
      await utils.sleep(250);
    }
    return null;
  }

  // querySelector (singular) only ever returns the *first* match in document order -- if
  // Facebook's multi-step wizard leaves a previous step's button in the DOM (hidden, not
  // unmounted) and it happens to come first, this would keep returning that dead element forever
  // and never reach the real, visible one further down. querySelectorAll + filtering fixes that,
  // but a real test still got stuck on step 2 (Delivery method) even after that fix -- the listing
  // preview panel has its own photo-carousel arrows, and a generic aria-label="Next"/"Previous" on
  // a "next photo" control is a very plausible second collision. The real wizard button actually
  // displays the word as visible text ("Next"), while an icon-only carousel arrow wouldn't, so
  // requiring the element's own text to exactly match the label rules out anything icon-only.
  function findFacebookActionButton(label) {
    const candidates = document.querySelectorAll(`[aria-label="${label}"][role="button"]`);
    return (
      Array.from(candidates).find(
        (el) => utils.isVisible(el) && (el.textContent || "").trim() === label
      ) || null
    );
  }

  async function waitForFacebookActionButton(label, timeoutMs = 6000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const btn = findFacebookActionButton(label);
      if (btn && btn.getAttribute("aria-disabled") !== "true") return btn;
      await utils.sleep(250);
    }
    return null;
  }

  // Clothing/Shoes are split by gender on Facebook ("Women's clothing & shoes" / "Men's clothing
  // & shoes") with no ungendered option -- audience disambiguates before falling back to the
  // categoryDetail/category text alone, which would otherwise just match whichever comes first.
  const FACEBOOK_GENDERED_CATEGORIES = new Set(["Clothing", "Shoes"]);

  async function facebookPickCategory(listing, result) {
    const trigger = await waitForFacebookComboboxByLabel("Category", 8000);
    if (!trigger) {
      result.missing.push("category (pick manually)");
      return;
    }
    trigger.click();
    await utils.sleep(400);

    const candidates = [];
    if (listing.categoryDetail) candidates.push(listing.categoryDetail);
    if (FACEBOOK_GENDERED_CATEGORIES.has(listing.category) && listing.audience) {
      const a = String(listing.audience).toLowerCase();
      if (a === "men") candidates.push("Men's clothing & shoes");
      if (a === "women") candidates.push("Women's clothing & shoes");
    }
    if (listing.category) candidates.push(listing.category);

    const option = utils.findButtonByText(candidates);
    if (!option) {
      result.missing.push("category (pick manually)");
      return;
    }
    option.click();
    result.filled.push(`category (${(option.textContent || "").trim()})`);
  }

  // PostMost's 6 condition labels mapped onto Facebook's real 4-option set -- confirmed live via
  // a real screenshot of the open dropdown: "New", "Used - Like New", "Used - Good", "Used - Fair",
  // all with a plain hyphen. Two prior fixes here both missed: an exact-string match (right text,
  // wrong assumption it'd fail) and a keyword match scoped to [role="button"] (right text, wrong
  // element type -- Condition's label carries aria-haspopup="listbox", unlike Category's, meaning
  // its real options are some other element entirely, not the [role="button"] divs Category uses).
  // Rather than guess the element type a third time, this matches by exact text on every leaf
  // element on the page regardless of tag or role -- sidesteps the guessing entirely, and a leaf
  // text node's parent still receives the click via normal event bubbling.
  const FACEBOOK_CONDITION_TEXT = {
    "new with tags": "New",
    "new without tags": "New",
    "like new": "Used - Like New",
    good: "Used - Good",
    fair: "Used - Fair",
    poor: "Used - Fair",
  };

  function findFacebookLeafByExactText(text) {
    const wanted = String(text).trim().toLowerCase();
    const candidates = document.querySelectorAll("body *");
    for (const el of candidates) {
      if (el.children.length > 0) continue;
      if ((el.textContent || "").trim().toLowerCase() === wanted && utils.isVisible(el)) return el;
    }
    return null;
  }

  // Color, Material, SKU, and the "Hide from friends"/"Boost listing" toggles all live inside a
  // collapsed "More details" panel (confirmed live: expanding it flips its trigger's aria-expanded
  // from "false" to "true") -- expanded once, up front, rather than duplicating this check in
  // every field that needs it.
  async function facebookExpandMoreDetails() {
    const trigger = Array.from(document.querySelectorAll('[role="button"]')).find(
      (el) => (el.textContent || "").trim().startsWith("More details")
    );
    if (trigger && trigger.getAttribute("aria-expanded") === "false") {
      trigger.click();
      await utils.sleep(400);
    }
  }

  // Confirmed live: Color is a role="combobox" flat-list picker, same interaction as Category/
  // Condition, not a plain text field.
  async function facebookPickColor(listing, result) {
    if (!listing.color) return;
    const trigger = await waitForFacebookComboboxByLabel("Color", 4000);
    if (!trigger) {
      result.missing.push("color (pick manually)");
      return;
    }
    trigger.click();
    await utils.sleep(400);
    const option = utils.findButtonByText([listing.color]);
    if (option) {
      option.click();
      result.filled.push("color");
    } else {
      result.missing.push("color (pick manually)");
    }
  }

  // "Hide from friends" (confirmed live: aria-checked="false" is Facebook's own default) is
  // hardcoded on for every listing -- same pattern as Poshmark's Smart Sell toggle being hardcoded
  // off -- since most resellers running this as a business don't want their own friends list
  // seeing every item they're flipping, and there's no per-user marketplace-preferences setting to
  // make this configurable yet.
  async function facebookHideFromFriends(result) {
    const toggle = await utils.waitForElement(['input[aria-label="Hide from friends"]'], 4000);
    if (!toggle) {
      result.missing.push('"Hide from friends" (turn on manually)');
      return;
    }
    if (toggle.getAttribute("aria-checked") !== "true" && !toggle.checked) {
      toggle.click();
    }
    result.filled.push("hide from friends");
  }

  async function facebookPickCondition(listing, result) {
    const optionText = FACEBOOK_CONDITION_TEXT[String(listing.condition || "").toLowerCase().trim()];
    if (!optionText) {
      result.missing.push("condition (pick manually)");
      return;
    }
    const trigger = await waitForFacebookComboboxByLabel("Condition", 8000);
    if (!trigger) {
      result.missing.push("condition (pick manually)");
      return;
    }
    trigger.click();
    await utils.sleep(500);
    const option = findFacebookLeafByExactText(optionText);
    if (option) {
      option.click();
      result.filled.push("condition");
    } else {
      // Close the dropdown instead of leaving it open with nothing clicked -- a stuck-open
      // dropdown also keeps this required field empty, which is why Next never enabled either.
      trigger.click();
      result.missing.push("condition (pick manually)");
    }
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
      async fill(listing, result) {
        // Facebook Marketplace is a much heavier page than OfferUp/Poshmark -- give each field its
        // own wait rather than assuming they all hydrate together (a real test showed photos
        // succeed via the visibility-agnostic file-input lookup while every label-based field
        // came up empty, consistent with the page still rendering past a single shared wait).
        const titleEl = await waitForFacebookFieldByLabel("Title", "input", 12000);
        if (titleEl && listing.title) {
          utils.simulateTyping(titleEl, String(listing.title));
          result.filled.push("title");
        } else if (listing.title) {
          result.missing.push("title");
        }

        if (listing.price !== undefined && listing.price !== null && listing.price !== "") {
          const priceEl = await waitForFacebookFieldByLabel("Price", "input", 8000);
          if (priceEl) {
            utils.simulateTyping(priceEl, String(listing.price));
            result.filled.push("price");
          } else {
            result.missing.push("price");
          }
        }

        if (listing.description) {
          const descEl = await waitForFacebookFieldByLabel("Description", "textarea", 8000);
          if (descEl) {
            utils.simulateTyping(descEl, String(listing.description));
            result.filled.push("description");
          } else {
            result.missing.push("description");
          }
        }

        if (listing.photos && listing.photos.length > 0) {
          // The real photo input has no name/id, just this accept list -- a separate, unrelated
          // video input (accept="video/*") sits right next to it, excluded by the "image" match.
          result.photos = await utils.uploadPhotos(listing.photos, ['input[type="file"][accept*="image"]']);
          if (result.photos) result.filled.push("photos");
          else result.missing.push("photos (add manually)");
        }

        await facebookPickCategory(listing, result);
        await facebookPickCondition(listing, result);

        await facebookExpandMoreDetails();

        await facebookPickColor(listing, result);

        if (listing.material) {
          const materialEl = findFacebookFieldByLabel("Material", "input");
          if (materialEl) {
            utils.simulateTyping(materialEl, String(listing.material));
            result.filled.push("material");
          } else {
            result.missing.push("material");
          }
        }

        if (listing.sku) {
          const skuEl = findFacebookFieldByLabel("SKU", "input");
          if (skuEl) {
            utils.simulateTyping(skuEl, String(listing.sku));
            result.filled.push("sku");
          } else {
            result.missing.push("sku");
          }
        }

        await facebookHideFromFriends(result);

        // Step 1 (item details) -> Step 2 (delivery method). Next stays aria-disabled until every
        // required field actually has a value -- if category/condition matching missed, this
        // simply won't be there, and filling stops rather than advancing on an incomplete form.
        // A real test showed Next still disabled 3s after the last field interaction (Hide from
        // friends) even though the fields themselves were all correctly filled -- Facebook's own
        // validation apparently needs a bit longer than that to catch up, matching the more
        // generous wait already given to every other button/field in this flow.
        const step1Next = await waitForFacebookActionButton("Next", 8000);
        if (!step1Next) {
          result.missing.push("finish remaining required fields and click Next yourself");
          result.submitted = false;
          return;
        }
        step1Next.click();

        // Step 2 (delivery method) -> Step 3. Nothing here needs touching: Location is pre-filled
        // from the seller's own profile and Delivery method already defaults to "Local pickup
        // only".
        const step2Next = await waitForFacebookActionButton("Next", 6000);
        if (!step2Next) {
          result.missing.push("click Next on Delivery method, then Publish, yourself");
          result.submitted = false;
          return;
        }
        await utils.sleep(300);
        step2Next.click();

        // Step 3 (list in more places) -> Publish. "List publicly to Marketplace" is checked by
        // default and groups are optional, so this is the real, final submit.
        const publishBtn = await waitForFacebookActionButton("Publish", 6000);
        if (!publishBtn) {
          result.missing.push("click Publish yourself to finish");
          result.submitted = false;
          return;
        }
        await utils.sleep(300);
        publishBtn.click();
        result.submitted = true;
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
      async fill(listing, result) {
        await poshmarkDismissStartupModals();

        const titleEl = await utils.waitForElement(['input[data-vv-name="title"]'], 8000);
        if (titleEl && listing.title) {
          utils.simulateTyping(titleEl, String(listing.title).slice(0, 80));
          result.filled.push("title");
        } else if (listing.title) {
          result.missing.push("title");
        }

        if (listing.description) {
          const descEl = utils.findElement(['textarea[data-vv-name="description"]']);
          if (descEl) {
            utils.simulateTyping(descEl, String(listing.description).slice(0, 1500));
            result.filled.push("description");
          } else {
            result.missing.push("description");
          }
        }

        await poshmarkUploadPhotos(listing, result);
        await poshmarkPickCategory(listing, result);
        await poshmarkPickCondition(listing, result);
        await poshmarkFillPrice(listing, result);

        // Deliberately stops here rather than clicking through Poshmark's real two-step submit
        // ("Next", then a second "Share Listing" screen's "List This Item"). Every field above
        // can actually be completed (unlike OfferUp's Location), so this isn't a missing-data
        // gap -- it's a deliberate extra margin given this platform's own history (a real
        // account flagged by Poshmark's bot detection), even though a human-paced browser click
        // here carries none of the risk that flagged it in the first place (that was unattended,
        // headless, server-side automation -- a different thing entirely).
        result.missing.push("review, then click Next and List This Item yourself to actually publish");
        result.submitted = false;
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
