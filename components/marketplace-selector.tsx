"use client";

import { useState } from "react";
import { PLATFORMS, PlatformId } from "@/lib/marketplaces/platforms";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MarketplaceSelector({
  selected,
  onChange,
}: {
  selected: PlatformId[];
  onChange: (selected: PlatformId[]) => void;
}) {
  function toggle(platform: PlatformId) {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  }

  const connectablePlatforms = PLATFORMS.filter((p) => p.authType !== "none");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {connectablePlatforms.map((platform) => {
        const isSelected = selected.includes(platform.id);
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => toggle(platform.id)}
            className={cn(
              "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
              isSelected ? "border-primary bg-primary/5" : "border-input hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: platform.color }} />
              <div>
                <p className="font-medium">{platform.name}</p>
                <p className="text-xs text-muted-foreground">{platform.supportsApi ? "API" : "Automation"}</p>
              </div>
            </div>
            <Badge variant={isSelected ? "default" : "outline"}>{isSelected ? "Selected" : "Select"}</Badge>
          </button>
        );
      })}
    </div>
  );
}

export function useMarketplaceSelector(initial: PlatformId[] = []) {
  const [selected, setSelected] = useState<PlatformId[]>(initial);
  return { selected, setSelected };
}
