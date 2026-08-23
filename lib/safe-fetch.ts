import dns from "node:dns/promises";
import net from "node:net";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT_MS = 10_000;

export class SafeFetchError extends Error {}

function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    return false;
  }
  return true;
}

/**
 * Fetches a user-supplied URL server-side while guarding against SSRF: only https:// is
 * allowed, and every resolved IP for the hostname is checked against private/loopback/
 * link-local ranges before the request is made — a malicious URL can't be used to probe
 * internal infrastructure. Response size and total time are both capped.
 */
export async function safeFetchText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new SafeFetchError("Only https:// URLs are supported.");
  }

  let addresses: string[];
  try {
    const results = await dns.lookup(url.hostname, { all: true, verbatim: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new SafeFetchError("Couldn't resolve that host.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new SafeFetchError("That URL points to a host we can't fetch from.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!response.ok) {
      throw new SafeFetchError(`The URL returned an error (HTTP ${response.status}).`);
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
      throw new SafeFetchError("That file is too large to import (5MB limit).");
    }
    if (!response.body) {
      return await response.text();
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new SafeFetchError("That file is too large to import (5MB limit).");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  } catch (err) {
    if (err instanceof SafeFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new SafeFetchError("Timed out fetching that URL.");
    }
    throw new SafeFetchError("Couldn't fetch that URL.");
  } finally {
    clearTimeout(timeout);
  }
}
