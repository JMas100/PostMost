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

const nextConfig = {
  images: {
    remotePatterns: imageHosts().map((hostname) => ({ protocol: "https", hostname })),
  },
  outputFileTracingIncludes: {
    "/api/jobs/run": playwrightTracing,
    "/api/extension/session": playwrightTracing,
    "/settings": playwrightTracing,
    "/settings/**": playwrightTracing,
  },
};

export default nextConfig;
