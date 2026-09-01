"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  connectMarketplaceAccount,
  disconnectMarketplaceAccount,
  getOAuthUrl,
} from "@/lib/actions/accounts";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlatformLogo } from "@/components/platform-logo";
import { toast } from "sonner";
import { ExternalLink, Link2, Unlink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

// Must match SESSION_AUTH_PLATFORMS in app/api/extension/session/route.ts. Poshmark proved the
// whole chain end-to-end; Mercari was added after confirming its password login is blocked by
// reCAPTCHA Enterprise (2026-08-26) -- exactly the case this mechanism exists for.
const SESSION_AUTH_PLATFORMS = new Set(["poshmark", "mercari"]);

const LOGIN_URLS: Record<string, string> = {
  poshmark: "https://poshmark.com/login",
  mercari: "https://www.mercari.com/login/",
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
   *  (connectMarketplaceAccount/disconnectMarketplaceAccount/getOAuthUrl all throw for that
   *  role), this just avoids showing controls that would immediately fail. */
  canManage?: boolean;
}

export function MarketplaceAccountCard({ platform, account, stats, canManage = true }: MarketplaceAccountCardProps) {
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
          {canManage ? (
            <ConnectDialog platform={platform} account={account} />
          ) : !account ? (
            <span className="text-xs text-muted-foreground">Ask an admin to connect</span>
          ) : null}
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

export function ConnectDialog({ platform, account }: DialogProps) {
  const [open, setOpen] = useState(false);
  const extensionInstalled = useExtensionDetector();
  const supportsSessionAuth = SESSION_AUTH_PLATFORMS.has(platform.id) && platform.authType === "manual";
  const [tab, setTab] = useState<"session" | "password">(
    account?.authMethod === "password" ? "password" : "session"
  );

  const offerSessionTab = supportsSessionAuth && extensionInstalled === true;

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
          ) : offerSessionTab ? (
            <>
              <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setTab("session")}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 font-medium transition-colors",
                    tab === "session" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Browser session
                </button>
                <button
                  type="button"
                  onClick={() => setTab("password")}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 font-medium transition-colors",
                    tab === "password" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Username &amp; password
                </button>
              </div>
              {tab === "session" ? (
                <SessionConnectForm platform={platform} account={account} onDone={() => setOpen(false)} />
              ) : (
                <ManualForm platform={platform} account={account} onDone={() => setOpen(false)} />
              )}
            </>
          ) : (
            <ManualForm platform={platform} account={account} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionConnectForm({ platform, account, onDone }: FormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "ready">("start");
  // Deliberately not useTransition here: the "pending" period is bounded by an external
  // postMessage round-trip through the extension (which can take 15-20s, it launches a real
  // Playwright check), not a React state transition — startTransition's isPending only tracks
  // until its callback returns, which happens immediately since nothing in it is awaited.
  const [isVerifying, setIsVerifying] = useState(false);

  function openLogin() {
    window.open(LOGIN_URLS[platform.id], "_blank", "noopener,noreferrer");
    setStep("ready");
  }

  function captureSession() {
    setIsVerifying(true);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== "postmost-extension" || data.platform !== platform.id) return;
      if (data.type === "SESSION_CAPTURED") {
        window.removeEventListener("message", onMessage);
        setIsVerifying(false);
        toast.success(`${platform.name} connected via browser session`);
        onDone();
        router.refresh();
      } else if (data.type === "SESSION_CAPTURE_ERROR") {
        window.removeEventListener("message", onMessage);
        setIsVerifying(false);
        toast.error(data.message || `Couldn't connect ${platform.name}`);
      }
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "postmost", type: "CAPTURE_SESSION", platform: platform.id }, "*");

    // The extension always responds (success or error) -- this timeout is a safety net in case
    // a message gets dropped, not the primary completion path.
    setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setIsVerifying((wasVerifying) => {
        if (wasVerifying) toast.error(`${platform.name} connection timed out — try again.`);
        return false;
      });
    }, 45_000);
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
        <p className="text-muted-foreground">
          PostMost never sees your {platform.name} password — it uses the session from your own
          logged-in browser instead, so two-factor authentication works normally.
        </p>
      </div>
      {step === "start" ? (
        <Button type="button" onClick={openLogin} className="w-full">
          Open {platform.name} login <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Log in to {platform.name} in the tab that opened — including any verification step —
            then come back here.
          </p>
          <Button type="button" onClick={captureSession} disabled={isVerifying} className="w-full">
            {isVerifying ? "Verifying..." : "I've logged in — connect my session"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline"
            onClick={openLogin}
          >
            Reopen the login page
          </button>
        </div>
      )}
      {account && (
        <p className="text-center text-xs text-muted-foreground">
          Currently connected{account.authMethod === "session" ? " via browser session" : " with a password"}.
          Connecting again replaces it.
        </p>
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
