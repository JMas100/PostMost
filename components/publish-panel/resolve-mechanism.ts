import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PublishAccountSummary, ResolvedPlatform } from "./types";

export function resolveMechanisms(
  accounts: PublishAccountSummary[],
  extensionInstalled: boolean
): ResolvedPlatform[] {
  const connected = new Set(accounts.map((a) => a.platform));

  return PLATFORMS.filter((p) => p.authType !== "none").map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    authType: p.authType as "oauth" | "manual",
    mechanism: connected.has(p.id)
      ? "automation"
      : p.authType === "manual" && extensionInstalled
      ? "extension"
      : "unconnected",
  }));
}
