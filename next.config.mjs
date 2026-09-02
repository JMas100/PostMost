/** @type {import('next').NextConfig} */

// Hosts allowed for next/image optimization: the public storage/CDN base URL
// plus any extra hosts listed in NEXT_IMAGE_HOSTS (comma-separated).
function imageHosts() {
  const hosts = [];
  if (process.env.R2_PUBLIC_BASE_URL) {
    try {
      hosts.push(new URL(process.env.R2_PUBLIC_BASE_URL).hostname);
    } catch {
      // ignore malformed base URL
    }
  }
  for (const host of (process.env.NEXT_IMAGE_HOSTS || "").split(",")) {
    const trimmed = host.trim();
    if (trimmed) hosts.push(trimmed);
  }
  return Array.from(new Set(hosts));
}

// Routes that launch Playwright (via lib/marketplaces/automation/playwright-runner.ts) need
// playwright-core's and @sparticuz/chromium's package files explicitly traced -- Next's default
// output file tracing misses them (confirmed live in production: every post/delist job failed
// with "Cannot find module '.../playwright-core/browsers.json'" even though playwright-core is
// already on Next's serverExternalPackages list, since that only controls bundling, not tracing).
// Scoped to just the routes that actually use it, rather than a blanket '/*', since
// @sparticuz/chromium's bundled Chromium binary is large enough (~40MB) that adding it to every
// function would risk hitting Vercel's per-function size limit.
const playwrightTracing = ["node_modules/playwright-core/**/*", "node_modules/@sparticuz/chromium/**/*"];

// Static (no-nonce) CSP, per Next's own "Without Nonces" guidance -- a nonce-based policy would
// force every page into dynamic rendering (no static generation/ISR, no CDN caching), which
// isn't worth it here since 'unsafe-inline' is already required for Next's own hydration data
// and Tailwind/styled-jsx-style inline styles. img-src is scoped to the same configured hosts
// next/image already trusts, rather than a blanket https:.
function cspHeaderValue() {
  const imgHosts = imageHosts().map((h) => `https://${h}`).join(" ");
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${imgHosts ? ` ${imgHosts}` : ""}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig = {
  images: {
    remotePatterns: imageHosts().map((hostname) => ({ protocol: "https", hostname })),
  },
  outputFileTracingIncludes: {
    "/api/inngest": playwrightTracing,
    "/api/extension/session": playwrightTracing,
    "/settings": playwrightTracing,
    "/settings/**": playwrightTracing,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeaderValue() },
          // Superseded by CSP's frame-ancestors above for modern browsers, kept as a fallback
          // for older ones -- both close the same clickjacking gap (postmost.co embeddable in
          // an attacker's iframe to trick a logged-in user into clicking a real button).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
