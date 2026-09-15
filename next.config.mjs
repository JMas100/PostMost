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

// The browser uploads photos directly to object storage via a presigned PUT URL
// (lib/upload-client.ts) -- a real cross-origin request the page itself makes, not proxied
// through our own server, so CSP's connect-src has to explicitly allow it or the browser blocks
// the request outright before it ever leaves (surfaces as a bare "Load failed"/"Failed to fetch",
// no CORS error, since CSP enforcement happens client-side before the network request is even
// attempted -- a CORS-focused check on the bucket itself won't show this). Mirrors r2.ts's own
// getEndpoint() fallback so a custom S3_ENDPOINT (e.g. MinIO in tests) is covered too.
function uploadEndpointHost() {
  try {
    const endpoint = process.env.S3_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
    return endpoint ? new URL(endpoint).hostname : null;
  } catch {
    return null;
  }
}

// Static (no-nonce) CSP, per Next's own "Without Nonces" guidance -- a nonce-based policy would
// force every page into dynamic rendering (no static generation/ISR, no CDN caching), which
// isn't worth it here since 'unsafe-inline' is already required for Next's own hydration data
// and Tailwind/styled-jsx-style inline styles. img-src is scoped to the same configured hosts
// next/image already trusts, rather than a blanket https:.
function cspHeaderValue() {
  const imgHosts = imageHosts().map((h) => `https://${h}`).join(" ");
  const uploadHost = uploadEndpointHost();
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${imgHosts ? ` ${imgHosts}` : ""}`,
    "font-src 'self' data:",
    `connect-src 'self'${uploadHost ? ` https://${uploadHost}` : ""}`,
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
