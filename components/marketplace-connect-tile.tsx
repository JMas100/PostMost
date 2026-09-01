import { PlatformLogo } from "@/components/platform-logo";
import { ConnectDialog } from "@/components/marketplace-account-card";
import { PLATFORMS } from "@/lib/marketplaces/platforms";

/** The compressed form for an unconnected platform: a name and a button, not a full row. An
 *  unconnected marketplace carries no account name, listing count, or sync time, so it doesn't
 *  need the space a connected row does -- these sit four-up so twelve marketplaces fit one
 *  screen instead of a wall of identical-looking cards. Reuses the same ConnectDialog every
 *  other card uses, not a simplified stand-in. */
export function MarketplaceConnectTile({ platform, canManage = true }: { platform: (typeof PLATFORMS)[number]; canManage?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
      <PlatformLogo platform={platform.id} size={32} />
      <span className="text-sm font-medium">{platform.name}</span>
      {canManage ? <ConnectDialog platform={platform} /> : <span className="text-xs text-muted-foreground">Ask an admin</span>}
    </div>
  );
}
