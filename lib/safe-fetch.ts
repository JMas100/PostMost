import dns from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

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

type NodeLookupCallback = (err: NodeJS.ErrnoException | null, address: string, family: number) => void;
type NodeLookupAllCallback = (err: NodeJS.ErrnoException | null, addresses: { address: string; family: number }[]) => void;

/**
 * Builds a `lookup` function (the same shape Node's `net`/`tls` connectors accept) that always
 * resolves to one of the already-validated addresses instead of re-resolving the hostname. This
 * is what actually closes the DNS-rebinding gap: without it, validating IPs up front and then
 * letting the HTTP client do its own DNS resolution at connect time leaves a window where an
 * attacker's nameserver can return a public IP for the check and a private one (e.g.
 * 169.254.169.254) moments later for the real connection.
 */
function pinnedLookup(addresses: { address: string; family: 4 | 6 }[]) {
  return (
    hostname: string,
    options: { family?: number | "IPv4" | "IPv6"; all?: boolean } | number,
    callback: NodeLookupCallback | NodeLookupAllCallback
  ) => {
    const wantsAll = typeof options === "object" && options !== null && options.all === true;
    const rawFamily = typeof options === "object" && options !== null ? options.family : typeof options === "number" ? options : undefined;
    const family = rawFamily === "IPv4" ? 4 : rawFamily === "IPv6" ? 6 : rawFamily;
    const matches = family ? addresses.filter((a) => a.family === family) : addresses;

    if (matches.length === 0) {
      (callback as NodeLookupCallback)(new Error("No pre-validated address available for this host"), "", 0);
      return;
    }
    if (wantsAll) {
      (callback as NodeLookupAllCallback)(null, matches);
    } else {
      (callback as NodeLookupCallback)(null, matches[0].address, matches[0].family);
    }
  };
}

/**
 * Fetches a user-supplied URL server-side while guarding against SSRF: only https:// is
 * allowed, every resolved IP for the hostname is checked against private/loopback/link-local
 * ranges before the request is made, and the actual connection is pinned to those validated
 * addresses via a custom Agent (rather than letting the HTTP client re-resolve the hostname on
 * its own) so a rebinding DNS server can't swap in a private IP between the check and the
 * connect. Response size and total time are both capped.
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

  let addresses: { address: string; family: 4 | 6 }[];
  try {
    const results = await dns.lookup(url.hostname, { all: true, verbatim: true });
    addresses = results.map((r) => ({ address: r.address, family: r.family as 4 | 6 }));
  } catch {
    throw new SafeFetchError("Couldn't resolve that host.");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new SafeFetchError("That URL points to a host we can't fetch from.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const agent = new Agent({ connect: { lookup: pinnedLookup(addresses) } });

  try {
    const response = await undiciFetch(url, { signal: controller.signal, redirect: "error", dispatcher: agent });
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
    await agent.close();
  }
}
