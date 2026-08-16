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

const nextConfig = {
  images: {
    remotePatterns: imageHosts().map((hostname) => ({ protocol: "https", hostname })),
  },
};

export default nextConfig;
