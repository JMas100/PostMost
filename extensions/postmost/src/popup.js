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

const PLATFORM_NAMES = {
  facebook: "Facebook",
  offerup: "OfferUp",
  poshmark: "Poshmark",
  mercari: "Mercari",
  depop: "Depop",
  vinted: "Vinted",
  grailed: "Grailed",
  craigslist: "Craigslist",
};

function encodePayload(listing) {
  return "#postmost=" + btoa(JSON.stringify({ listing }));
}

async function loadListing() {
  const { pendingListing, pendingPlatforms } = await chrome.storage.local.get([
    "pendingListing",
    "pendingPlatforms",
  ]);

  if (!pendingListing) {
    document.getElementById("empty").style.display = "block";
    document.getElementById("listing").style.display = "none";
    return;
  }

  document.getElementById("empty").style.display = "none";
  document.getElementById("listing").style.display = "block";
  document.getElementById("title").textContent = pendingListing.title;
  document.getElementById("price").textContent = "$" + Number(pendingListing.price).toFixed(2);

  const platformsEl = document.getElementById("platforms");
  platformsEl.innerHTML = "";

  const platforms = pendingPlatforms && pendingPlatforms.length > 0
    ? pendingPlatforms.filter((p) => PLATFORM_URLS[p])
    : Object.keys(PLATFORM_URLS);

  platforms.forEach((platform) => {
    const btn = document.createElement("button");
    btn.className = "platform";
    btn.textContent = PLATFORM_NAMES[platform] || platform;
    btn.addEventListener("click", () => openPlatform(platform, pendingListing));
    platformsEl.appendChild(btn);
  });
}

async function openPlatform(platform, listing) {
  const url = PLATFORM_URLS[platform];
  if (!url) return;

  const fullUrl = url + encodePayload(listing);
  await chrome.tabs.create({ url: fullUrl, active: false });
  showStatus(`Opened ${PLATFORM_NAMES[platform] || platform}`);
}

function showStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  setTimeout(() => (el.textContent = ""), 3000);
}

document.addEventListener("DOMContentLoaded", loadListing);
