"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  connectMarketplaceAccount,
  disconnectMarketplaceAccount,
  getOAuthUrl,
} from "@/lib/actions/accounts";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlatformLogo } from "@/components/platform-logo";
import { toast } from "sonner";
import { ExternalLink, Link2, Unlink } from "lucide-react";

export type AccountView = {
  id: string;
  userId: string;
  platform: string;
  displayName: string;
  externalId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasCredentials: boolean;
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
}

export function MarketplaceAccountCard({ platform, account, stats }: MarketplaceAccountCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlatformLogo platform={platform.id} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium">{platform.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {account ? account.displayName : platform.authType === "oauth" ? "OAuth" : "Manual / Automation"}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge variant={account ? "default" : "secondary"}>
            {account ? "Connected" : "Not connected"}
          </Badge>
          <ConnectDialog platform={platform} account={account} />
        </div>
      </div>
      {account && stats && (
        <div className="grid grid-cols-4 gap-2 border-t pt-3 text-center text-sm">
          <div>
            <p className="font-semibold">{stats.posted}</p>
            <p className="text-xs text-muted-foreground">Live</p>
          </div>
          <div>
            <p className={stats.failed > 0 ? "font-semibold text-destructive" : "font-semibold"}>{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div>
            <p className="font-semibold">{stats.sold}</p>
            <p className="text-xs text-muted-foreground">Sold</p>
          </div>
          <div>
            <p className="font-semibold">${stats.revenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface DialogProps {
  platform: (typeof PLATFORMS)[number];
  account?: AccountView;
}

function ConnectDialog({ platform, account }: DialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {account ? <Unlink className="mr-1 h-3 w-3" /> : <Link2 className="mr-1 h-3 w-3" />}
        {account ? "Manage" : "Connect"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlatformLogo platform={platform.id} size={40} />
              {account ? "Manage" : "Connect"} {platform.name}
            </DialogTitle>
            <DialogDescription>
              {platform.authType === "oauth"
                ? "Authorize PostMost to list items on your behalf."
                : `${platform.name} doesn't offer a public API, so PostMost signs into your account directly — the same as you would in a browser — to post and remove listings on your behalf.`}
            </DialogDescription>
          </DialogHeader>
          {platform.authType === "oauth" ? (
            <OAuthForm platform={platform} account={account} onDone={() => setOpen(false)} />
          ) : (
            <ManualForm platform={platform} account={account} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
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

function ManualForm({ platform, account, onDone }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const displayName = formData.get("displayName") as string;
    const password = formData.get("password") as string;

    if (!displayName.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!account?.hasCredentials && !password.trim()) {
      toast.error("Password is required");
      return;
    }

    startTransition(async () => {
      try {
        await connectMarketplaceAccount({
          platform: platform.id,
          displayName,
          // The adapter logs in with these directly — externalId is the username,
          // accessToken is the password. There's no OAuth token here to speak of.
          accessToken: password || undefined,
          externalId: displayName,
        });
        toast.success(`${platform.name} account connected`);
        onDone();
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect account";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off">
      {/* Browsers/password managers key off type="password" + adjacent text input to decide
          "this looks like a login form for the current site" and offer to fill in PostMost's
          own saved credentials -- these fields are for a *different* site's login, so
          autoComplete is deliberately set to values that tell every major password manager
          (Chrome, Safari/iCloud Keychain, 1Password, LastPass, Bitwarden) not to touch them. */}
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-displayName`}>Username or email</Label>
        <Input
          id={`${platform.id}-displayName`}
          name="displayName"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          defaultValue={account?.displayName ?? ""}
          placeholder={`Your ${platform.name} login`}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-password`}>Password</Label>
        <Input
          id={`${platform.id}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          placeholder={account?.hasCredentials ? "Leave blank to keep your current password" : "Your account password"}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Stored encrypted, used only to sign in and manage listings on {platform.name} on your
        behalf. Never shown again after you save it. If a password is entered, PostMost signs
        into {platform.name} to confirm it works before saving — this takes a few seconds.
      </p>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Verifying..." : account ? "Update" : "Connect"}
        </Button>
        {account && (
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDisconnect}>
            Disconnect
          </Button>
        )}
      </div>
    </form>
  );
}
