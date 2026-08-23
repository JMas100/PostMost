"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@/lib/marketplaces/platforms";
import { MarketplaceAccountCard, type AccountView } from "@/components/marketplace-account-card";

interface SettingsClientProps {
  accounts: AccountView[];
}

const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType !== "none");

export function SettingsClient({ accounts }: SettingsClientProps) {
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams?.get("connected");
    const error = searchParams?.get("error");
    if (!connected && !error) return;

    if (connected) {
      const platformName = getPlatform(connected)?.name ?? connected;
      toast.success(`${platformName} account connected`);
    } else if (error) {
      toast.error(error);
    }
    router.replace("/settings");
  }, [searchParams, router]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONNECTABLE_PLATFORMS.map((platform) => (
          <MarketplaceAccountCard
            key={platform.id}
            platform={platform}
            account={accountByPlatform.get(platform.id)}
          />
        ))}
      </div>
    </div>
  );
}
