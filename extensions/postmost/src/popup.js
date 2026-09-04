// Same URLs as marketplace-content.js/platforms.js use to detect a host, kept as a small local
// copy rather than an import -- popup.html and the marketplace content-script group are separate
// execution contexts (see manifest.json), so there's nothing to share code with here.
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

// Name + accent color per platform, for both the manual open-tabs flow and the connected-accounts
// list. Mirrors lib/marketplaces/platforms.ts, duplicated here since that's a TS module inside the
// Next.js app and isn't reachable from the extension bundle.
const PLATFORM_META = {
  ebay: { name: "eBay", color: "#e53238" },
  etsy: { name: "Etsy", color: "#F1641E" },
  poshmark: { name: "Poshmark", color: "#C2185B" },
  mercari: { name: "Mercari", color: "#FF3B3B" },
  depop: { name: "Depop", color: "#000000" },
  facebook: { name: "Facebook", color: "#1877F2" },
  craigslist: { name: "Craigslist", color: "#4C4C4C" },
  offerup: { name: "OfferUp", color: "#00A87E" },
  vinted: { name: "Vinted", color: "#007782" },
  grailed: { name: "Grailed", color: "#000000" },
  whatnot: { name: "Whatnot", color: "#9146FF" },
  shopify: { name: "Shopify", color: "#96BF48" },
};

// Hostname substring -> platform id, for reading the active tab. Only platforms with a live
// browser-session connect flow on the backend (see SESSION_AUTH_PLATFORMS in
// app/api/extension/session/route.ts) get the connect card. Mercari was tried and removed
// (2026-09-03): it runs Cloudflare Bot Management, which 403s the headless-Playwright
// verification request itself regardless of cookie validity -- this mechanism fundamentally
// can't clear that, so Mercari stays on the extension's own tab-fill flow instead.
const CONNECT_HOSTS = {
  "poshmark.com": "poshmark",
};

// Tried in order; the first one a lightweight fetch succeeds against is cached and reused. Covers
// local dev (localhost:3000) and production (postmost.co) without hardcoding one or the other --
// same origins already granted in manifest.json's host_permissions.
const ORIGIN_CANDIDATES = ["http://localhost:3000", "https://postmost.co"];

function platformMeta(id) {
  return PLATFORM_META[id] || { name: id, color: "#374151" };
}

async function resolveOrigin() {
  const { postmostOrigin } = await chrome.storage.local.get("postmostOrigin");
  const ordered = postmostOrigin
    ? [postmostOrigin, ...ORIGIN_CANDIDATES.filter((o) => o !== postmostOrigin)]
    : ORIGIN_CANDIDATES;

  for (const origin of ordered) {
    try {
      const res = await fetch(`${origin}/api/auth/session`, { credentials: "include", cache: "no-store" });
      if (res.ok) {
        await chrome.storage.local.set({ postmostOrigin: origin });
        return origin;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchSessionUser(origin) {
  try {
    // This endpoint returns an ETag, so a plain fetch could in principle be served a cached
    // response by the browser's HTTP cache instead of hitting the server -- no-store rules that
    // out. (Ruled out as the cause of one real "still shows signed in after logout" report during
    // testing -- that one was the session cookie genuinely still being valid, not a stale fetch --
    // but this is still correct practice for an auth-check endpoint regardless.)
    const res = await fetch(`${origin}/api/auth/session`, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body?.user || null;
  } catch {
    return null;
  }
}

async function fetchAccounts(origin) {
  try {
    const res = await fetch(`${origin}/api/extension/accounts`, { credentials: "include", cache: "no-store" });
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    return Array.isArray(body.accounts) ? body.accounts : [];
  } catch {
    return [];
  }
}

async function getActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch {
    return null;
  }
}

function platformForHost(hostname) {
  for (const [host, id] of Object.entries(CONNECT_HOSTS)) {
    if (hostname && hostname.includes(host)) return id;
  }
  return null;
}

/** Reads (never writes) the cookie jar for a platform via the background service worker --
 *  chrome.cookies is only callable there in Manifest V3. Non-destructive, safe to call just to
 *  check whether a connect card should show. */
function captureSession(platform) {
  return chrome.runtime.sendMessage({ type: "CAPTURE_SESSION", platform });
}

const root = document.getElementById("root");

function h(html) {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.firstElementChild;
}

function renderHeader(user, origin) {
  return `
    <div class="header">
      <div class="brand"><span class="dot">P</span>PostMost</div>
      ${
        user
          ? `<span class="badge"><span class="pip"></span>Signed in</span>`
          : ""
      }
    </div>
  `;
}

function renderGate(origin) {
  root.innerHTML = `
    <div class="gate">
      <span class="dot">P</span>
      <h2>Sign in to start posting</h2>
      <p>The extension posts on behalf of your PostMost account. It does nothing until you're signed in.</p>
      <button class="btn btn-primary" id="signin">Sign in</button>
    </div>
  `;
  document.getElementById("signin")?.addEventListener("click", () => {
    chrome.tabs.create({ url: `${origin}/login` });
  });
}

function renderOffline() {
  root.innerHTML = `
    <div class="gate">
      <span class="dot">P</span>
      <h2>Can't reach PostMost</h2>
      <p>We couldn't connect to the app. Check your connection, or that PostMost is running locally, and reopen this popup.</p>
    </div>
  `;
}

async function renderConnectCard(container, platform, tabId) {
  const meta = platformMeta(platform);
  const card = h(`
    <div class="card connect">
      <div class="card-title-row">
        <span class="avatar" style="background:${meta.color}">${meta.name[0]}</span>
        <div style="flex:1;min-width:0">
          <div class="card-title">You're signed in to ${meta.name}</div>
          <div class="card-sub">Connect this account to post and delist automatically</div>
        </div>
      </div>
      <button class="btn btn-primary" id="connect-btn">Connect this account</button>
      <div class="card-note">We capture the session this tab already has. Your password is never sent to us and never typed by us.</div>
    </div>
  `);
  container.appendChild(card);

  document.getElementById("connect-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("connect-btn");
    btn.disabled = true;
    btn.textContent = "Connecting…";

    const captured = await captureSession(platform);
    if (!captured?.ok) {
      renderRejected(container, card, meta, platform, tabId, captured?.error || "Couldn't read the session");
      return;
    }

    const origin = await resolveOrigin();
    try {
      const res = await fetch(`${origin}/api/extension/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform, cookies: captured.cookies }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 422 || (!res.ok && body.error)) {
        renderRejected(container, card, meta, platform, tabId, body.error || "That session didn't work");
        return;
      }
      if (!res.ok) {
        renderRejected(container, card, meta, platform, tabId, body.error || "Couldn't save the session");
        return;
      }
      // Success -- re-render the whole popup so the account moves into the Connected list.
      init();
    } catch (err) {
      renderRejected(container, card, meta, platform, tabId, err?.message || "Couldn't save the session");
    }
  });
}

function renderRejected(container, oldCard, meta, platform, tabId, message) {
  const rejected = h(`
    <div class="card rejected">
      <div class="card-title-row">
        <span class="avatar" style="background:${meta.color}">${meta.name[0]}</span>
        <div class="card-title">That session didn't work</div>
      </div>
      <div class="card-note">${escapeHtml(meta.name)} rejected it — ${escapeHtml(message)}. Nothing was saved.</div>
      <button class="btn btn-primary" id="retry-btn">Reload ${escapeHtml(meta.name)} and try again</button>
    </div>
  `);
  oldCard.replaceWith(rejected);
  document.getElementById("retry-btn")?.addEventListener("click", async () => {
    if (tabId) {
      try {
        await chrome.tabs.reload(tabId);
      } catch {
        // tab may have closed; nothing more to do
      }
    }
    window.close();
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAccountsList(container, accounts) {
  if (accounts.length === 0) {
    container.appendChild(
      h(`<div class="empty-accounts">No marketplaces connected yet. Connect one from a marketplace tab, or from Settings in PostMost.</div>`)
    );
    return;
  }
  const rows = accounts
    .map((a) => {
      const meta = platformMeta(a.platform);
      return `
        <div class="account-row">
          <span class="swatch" style="background:${meta.color}">${meta.name[0]}</span>
          <span class="name">${escapeHtml(meta.name)}</span>
        </div>
      `;
    })
    .join("");
  container.appendChild(h(`<div><div class="label">Connected</div><div class="account-list">${rows}</div></div>`));
}

function renderFooter(origin) {
  return `
    <div class="footer">
      <span class="muted">Nothing posting right now</span>
      <a href="${origin}" target="_blank">Open PostMost</a>
    </div>
  `;
}

// --- Manual send-to-extension flow (unconnected manual-auth platforms) --------------------------
// Unchanged behavior from before this rebuild: a listing sent via SEND_LISTING (publish-panel's
// sendToExtension) opens marketplace create-listing tabs and content scripts fill them in. Kept
// as-is because it's still the real fallback for manual platforms with no connected account yet
// (see resolveMechanisms() in components/publish-panel/resolve-mechanism.ts).

async function renderPendingListing(pendingListing, pendingPlatforms, lastFillResult) {
  const platforms = pendingPlatforms && pendingPlatforms.length > 0
    ? pendingPlatforms.filter((p) => PLATFORM_URLS[p])
    : Object.keys(PLATFORM_URLS);

  const buttons = platforms
    .map((p) => `<button class="platform" data-platform="${p}">${platformMeta(p).name}</button>`)
    .join("");
  const openAll = platforms.length > 1 ? `<button class="platform open-all" id="open-all">Open all</button>` : "";

  root.innerHTML = `
    <div class="header"><div class="brand"><span class="dot">P</span>PostMost</div></div>
    <div class="section">
      <div class="card">
        <div class="card-title">${escapeHtml(pendingListing.title)}</div>
        <div class="card-sub">$${Number(pendingListing.price).toFixed(2)}</div>
      </div>
      <div class="platforms">${buttons}${openAll}</div>
      <div id="status"></div>
      <button class="btn btn-secondary" id="clear">Clear listing</button>
    </div>
  `;

  if (lastFillResult) {
    const time = new Date(lastFillResult.timestamp).toLocaleTimeString();
    const filled = (lastFillResult.filled || []).join(", ") || "none";
    document.getElementById("status").textContent = `Last fill (${time}): ${lastFillResult.submitted ? "submitted" : "partial"} — filled ${filled}`;
  }

  document.querySelectorAll("button.platform[data-platform]").forEach((btn) => {
    btn.addEventListener("click", () => openPlatform(btn.dataset.platform));
  });
  document.getElementById("open-all")?.addEventListener("click", () => openAll(platforms));
  document.getElementById("clear")?.addEventListener("click", async () => {
    await chrome.storage.local.remove(["pendingListing", "pendingPlatforms", "lastFillResult", "filledPlatforms"]);
    init();
  });
}

async function openPlatform(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) return;
  const { pendingPlatforms = [] } = await chrome.storage.local.get("pendingPlatforms");
  if (!pendingPlatforms.includes(platform)) {
    pendingPlatforms.push(platform);
    await chrome.storage.local.set({ pendingPlatforms });
  }
  await chrome.tabs.create({ url, active: false });
  showStatus(`Opened ${platformMeta(platform).name}`);
}

async function openAll(platforms) {
  const { pendingPlatforms = [] } = await chrome.storage.local.get("pendingPlatforms");
  const merged = Array.from(new Set([...pendingPlatforms, ...platforms]));
  await chrome.storage.local.set({ pendingPlatforms: merged });
  for (const platform of platforms) {
    const url = PLATFORM_URLS[platform];
    if (url) await chrome.tabs.create({ url, active: false });
  }
  showStatus("Opened all marketplaces");
}

function showStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text;
  setTimeout(() => {
    if (el.isConnected) el.textContent = "";
  }, 3000);
}

// --- Top-level state machine ---------------------------------------------------------------------

async function init() {
  const origin = await resolveOrigin();
  if (!origin) {
    renderOffline();
    return;
  }

  const user = await fetchSessionUser(origin);
  if (!user) {
    renderGate(origin);
    return;
  }

  const { pendingListing, pendingPlatforms, lastFillResult } = await chrome.storage.local.get([
    "pendingListing",
    "pendingPlatforms",
    "lastFillResult",
  ]);
  if (pendingListing) {
    await renderPendingListing(pendingListing, pendingPlatforms, lastFillResult);
    return;
  }

  root.innerHTML = renderHeader(user, origin) + `<div class="section" id="idle-section"></div>`;
  const section = document.getElementById("idle-section");

  const [accounts, tab] = await Promise.all([fetchAccounts(origin), getActiveTab()]);
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  if (tab?.url) {
    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      hostname = "";
    }
    const platform = platformForHost(hostname);
    if (platform && !connectedPlatforms.has(platform)) {
      const captured = await captureSession(platform);
      if (captured?.ok) {
        await renderConnectCard(section, platform, tab.id);
      }
    }
  }

  renderAccountsList(section, accounts);
  section.insertAdjacentHTML("beforeend", renderFooter(origin));
  section.querySelector(".footer a")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: origin });
  });
}

document.addEventListener("DOMContentLoaded", init);
