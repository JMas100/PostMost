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

function encodePayload(platform, listing) {
  return "#postmost=" + btoa(JSON.stringify({ platform, listing }));
}

async function loadListing() {
  const { pendingListing, pendingPlatforms, lastFillResult } = await chrome.storage.local.get([
    "pendingListing",
    "pendingPlatforms",
    "lastFillResult",
  ]);

  const emptyEl = document.getElementById("empty");
  const listingEl = document.getElementById("listing");
  const statusEl = document.getElementById("status");

  if (!pendingListing) {
    emptyEl.style.display = "block";
    listingEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  listingEl.style.display = "block";
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

  if (lastFillResult) {
    const time = new Date(lastFillResult.timestamp).toLocaleTimeString();
    const filled = (lastFillResult.filled || []).join(", ") || "none";
    statusEl.textContent = `Last fill (${time}): ${lastFillResult.submitted ? "submitted" : "partial"} — filled ${filled}`;
  }
}

async function openPlatform(platform, listing) {
  const url = PLATFORM_URLS[platform];
  if (!url) return;

  const fullUrl = url + encodePayload(platform, listing);
  await chrome.tabs.create({ url: fullUrl, active: false });
  showStatus(`Opened ${PLATFORM_NAMES[platform] || platform}`);
}

function showStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  setTimeout(() => (el.textContent = ""), 3000);
}

document.addEventListener("DOMContentLoaded", loadListing);
document.getElementById("clear")?.addEventListener("click", async () => {
  await chrome.storage.local.remove(["pendingListing", "pendingPlatforms", "lastFillResult"]);
  loadListing();
});
