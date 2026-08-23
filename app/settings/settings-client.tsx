"use client";

import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { MarketplaceAccountCard, type AccountView } from "@/components/marketplace-account-card";

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
