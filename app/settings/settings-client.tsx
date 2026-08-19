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

type AccountView = {
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

interface SettingsClientProps {
  accounts: AccountView[];
}

const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType !== "none");

export function SettingsClient({ accounts }: SettingsClientProps) {
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONNECTABLE_PLATFORMS.map((platform) => {
          const account = accountByPlatform.get(platform.id);
          return (
            <AccountCard
              key={platform.id}
              platform={platform}
              account={account}
            />
          );
        })}
      </div>
    </div>
  );
}

interface AccountCardProps {
  platform: (typeof PLATFORMS)[number];
  account?: AccountView;
}

function AccountCard({ platform, account }: AccountCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <PlatformLogo platformId={platform.id} />
        <div>
          <p className="font-medium">{platform.name}</p>
          <p className="text-xs text-muted-foreground">
            {platform.authType === "oauth" ? "OAuth" : "Manual / Automation"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={account ? "default" : "secondary"}>
          {account ? "Connected" : "Not connected"}
        </Badge>
        <ConnectDialog platform={platform} account={account} />
      </div>
    </div>
  );
}

function ConnectDialog({ platform, account }: AccountCardProps) {
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
            <PlatformLogo platformId={platform.id} className="h-5 w-16 px-1.5" />
            {account ? "Manage" : "Connect"} {platform.name}
          </DialogTitle>
          <DialogDescription>
            {platform.authType === "oauth"
              ? "Authorize PostMost to list items on your behalf."
              : "Add your account details so PostMost can post for you when automation is enabled."}
          </DialogDescription>
        </DialogHeader>
        {platform.authType === "oauth" ? (
          <OAuthForm platform={platform} onDone={() => setOpen(false)} />
        ) : (
          <ManualForm
            platform={platform}
            account={account}
            onDone={() => setOpen(false)}
          />
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

function OAuthForm({ platform, onDone: _onDone }: FormProps) {
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
    const accessToken = (formData.get("accessToken") as string) || undefined;
    const refreshToken = (formData.get("refreshToken") as string) || undefined;
    const externalId = (formData.get("externalId") as string) || displayName;
    const tokenExpiresAtValue = formData.get("tokenExpiresAt") as string;

    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    startTransition(async () => {
      try {
        await connectMarketplaceAccount({
          platform: platform.id,
          displayName,
          accessToken,
          refreshToken,
          externalId,
          tokenExpiresAt: tokenExpiresAtValue ? new Date(tokenExpiresAtValue) : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-displayName`}>Username / store name</Label>
        <Input
          id={`${platform.id}-displayName`}
          name="displayName"
          defaultValue={account?.displayName ?? ""}
          placeholder={`Your ${platform.name} username`}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-externalId`}>External user ID (optional)</Label>
        <Input
          id={`${platform.id}-externalId`}
          name="externalId"
          defaultValue={account?.externalId ?? ""}
          placeholder={account?.displayName ?? "Same as username"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-accessToken`}>Access token (optional)</Label>
        <Input
          id={`${platform.id}-accessToken`}
          name="accessToken"
          type="password"
          placeholder="Paste API or access token"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-refreshToken`}>Refresh token (optional)</Label>
        <Input
          id={`${platform.id}-refreshToken`}
          name="refreshToken"
          type="password"
          placeholder="Paste refresh token"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${platform.id}-tokenExpiresAt`}>Token expires at (optional)</Label>
        <Input
          id={`${platform.id}-tokenExpiresAt`}
          name="tokenExpiresAt"
          type="datetime-local"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Saving..." : account ? "Update" : "Connect"}
        </Button>
        {account && (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        )}
      </div>
    </form>
  );
}
