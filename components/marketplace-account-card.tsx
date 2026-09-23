"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectMarketplaceAccount, getOAuthUrl } from "@/lib/actions/accounts";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { useExtensionDetector } from "@/components/publish-panel/use-extension-detector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformLogo } from "@/components/platform-logo";
import { AutoDelistToggle } from "@/components/automation/auto-delist-toggle";
import { toast } from "sonner";
import { ExternalLink, Link2, Unlink, ShieldCheck, Info } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export type AccountView = {
  id: string;
  userId: string;
  platform: string;
  displayName: string;
  externalId: string | null;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasCredentials: boolean;
  authMethod: string;
  autoDelistEnabled: boolean;
  needsReauth: boolean;
  needsReauthReason: string | null;
};

export interface PlatformStats {
  posted: number;
  failed: number;
  sold: number;
  revenue: number;
}

interface MarketplaceAccountCardProps {
  platform: (typeof PLATFORMS)[number];
  account?: AccountView;
  stats?: PlatformStats;
  /** MEMBER can't connect/disconnect marketplace accounts -- server-side enforced already
   *  (disconnectMarketplaceAccount/getOAuthUrl both throw for that role), this just avoids
   *  showing controls that would immediately fail. */
  canManage?: boolean;
}

export function MarketplaceAccountCard({ platform, account, stats, canManage = true }: MarketplaceAccountCardProps) {
  return (
    <Card>
      <CardContent className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* onDark: the card can render on either theme, and a pure-black brand (Grailed) is
              invisible as plain colored text on a dark surface -- the white-tile fallback is
              always readable. showLabel=false since platform.name already renders beside it. */}
          <PlatformLogo platform={platform.id} size={40} onDark showLabel={false} />
          <div className="min-w-0">
            <p className="truncate font-medium">{platform.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {account ? account.displayName : platform.authType === "oauth" ? "OAuth" : "Posts via your browser"}
            </p>
            {account?.needsReauth && (
              <p className="truncate text-xs text-warning">{account.needsReauthReason ?? "Needs reconnecting"}</p>
            )}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge
            variant={!account ? (platform.authType === "manual" ? "live" : "secondary") : account.needsReauth ? "warningTint" : "live"}
          >
            {!account
              ? platform.authType === "manual"
                ? "Via extension"
                : "Not connected"
              : account.needsReauth
                ? "Needs reconnecting"
                : "Connected"}
          </Badge>
          {canManage ? (
            <ConnectDialog platform={platform} account={account} />
          ) : !account ? (
            <span className="text-xs text-muted-foreground">Ask an admin to connect</span>
          ) : null}
        </div>
      </div>
      {account && canManage && (
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Auto-delist</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{account.autoDelistEnabled ? "On" : "Off"}</span>
            <AutoDelistToggle accountId={account.id} initialEnabled={account.autoDelistEnabled} />
          </div>
        </div>
      )}
      {account && stats && (
        <div className="grid grid-cols-4 gap-2 border-t pt-3 text-center text-sm">
          <div>
            <p className="tnum font-semibold">{stats.posted}</p>
            <p className="text-xs text-muted-foreground">Live</p>
          </div>
          <div>
            <p className={cn("tnum font-semibold", stats.failed > 0 && "text-warning")}>{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div>
            <p className="tnum font-semibold">{stats.sold}</p>
            <p className="text-xs text-muted-foreground">Sold</p>
          </div>
          <div>
            <p className="tnum font-semibold">{formatCurrency(stats.revenue)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}

interface DialogProps {
  platform: (typeof PLATFORMS)[number];
  account?: AccountView;
}

export function ConnectDialog({ platform, account }: DialogProps) {
  const [open, setOpen] = useState(false);
  const isManual = platform.authType === "manual";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {account ? <Unlink className="mr-1 h-3 w-3" /> : isManual ? <Info className="mr-1 h-3 w-3" /> : <Link2 className="mr-1 h-3 w-3" />}
        {account ? "Manage" : isManual ? "How this works" : "Connect"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlatformLogo platform={platform.id} size={40} onDark showLabel={false} />
              {account ? "Manage" : isManual ? "How" : "Connect"} {platform.name}
              {!account && isManual ? " posting works" : ""}
            </DialogTitle>
            <DialogDescription>
              {platform.authType === "oauth"
                ? "Authorize PostMost to list items on your behalf."
                : `${platform.name} doesn't offer a public API. Rather than signing into your account from our servers -- exactly the kind of automated traffic marketplace bot detection exists to catch -- the PostMost browser extension fills out the real listing live, in your own already-signed-in tab, whenever you publish.`}
            </DialogDescription>
          </DialogHeader>
          {platform.authType === "oauth" ? (
            <OAuthForm platform={platform} account={account} onDone={() => setOpen(false)} />
          ) : (
            <ExtensionOnlyInfo platform={platform} account={account} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Replaces the old password/session connect forms for every manual-adapter platform -- server-
 *  side automation is retired (see ManualAdapterConfig.automationRetired) after a real,
 *  session-connected Poshmark account was flagged by bot detection despite never having a
 *  password on our site: the risk was never the password, it was the ongoing headless traffic
 *  itself. There is no "connect" step anymore -- the extension fills the real listing live in
 *  the seller's own tab whenever they publish. `account` being present here only ever means a
 *  leftover connection from before this change; the only action offered for it is Disconnect. */
function ExtensionOnlyInfo({ platform, account, onDone }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const extensionInstalled = useExtensionDetector();

  function handleDisconnect() {
    if (!account) return;
    startTransition(async () => {
      try {
        await disconnectMarketplaceAccount(account.id);
        toast.success(`${platform.name} account disconnected`);
        onDone();
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to disconnect";
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-4 pt-2">
      {account && (
        <div className="rounded-md border bg-warning/10 p-3 text-sm">
          <p className="text-muted-foreground">
            {account.displayName} is still connected from before {platform.name} posting moved to
            the browser extension. It&apos;s no longer used for anything -- disconnecting it is
            safe and doesn&apos;t change how posting works.
          </p>
        </div>
      )}
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
        <p className="text-muted-foreground">
          Nothing runs on our servers for {platform.name}. When you hit Publish, the extension
          opens {platform.name} in a new tab — already signed in as you — and fills out the real
          listing form live. You review and submit it yourself, the same as posting by hand.
        </p>
      </div>
      {extensionInstalled === true ? (
        <p className="text-sm text-success">The extension is installed and ready — just publish normally.</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The PostMost browser extension doesn&apos;t look installed in this browser yet — load it
          to publish to {platform.name}.
        </p>
      )}
      {account && (
        <Button variant="destructive" onClick={handleDisconnect} disabled={isPending} className="w-full">
          {isPending ? "Disconnecting..." : "Disconnect"}
        </Button>
      )}
    </div>
  );
}

interface FormProps {
  platform: (typeof PLATFORMS)[number];
  account?: AccountView;
  onDone: () => void;
}

function OAuthForm({ platform, account, onDone }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    startTransition(async () => {
      try {
        const url = await getOAuthUrl(platform.id);
        router.push(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not start OAuth";
        toast.error(message);
      }
    });
  }

  function handleDisconnect() {
    if (!account) return;
    startTransition(async () => {
      try {
        await disconnectMarketplaceAccount(account.id);
        toast.success(`${platform.name} account disconnected`);
        onDone();
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to disconnect";
        toast.error(message);
      }
    });
  }

  if (account) {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Connected as <span className="font-medium text-foreground">{account.displayName}</span>.
          Disconnecting stops PostMost from posting or removing listings on {platform.name} until
          you reconnect.
        </p>
        <Button variant="destructive" onClick={handleDisconnect} disabled={isPending} className="w-full">
          {isPending ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-muted-foreground">
        You will be redirected to {platform.name} to authorize PostMost. After authorizing,
        you will return here automatically.
      </p>
      <Button onClick={handleConnect} disabled={isPending} className="w-full">
        {isPending ? (
          "Redirecting..."
        ) : (
          <>
            Connect with {platform.name} <ExternalLink className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

