"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PlatformLogo } from "@/components/platform-logo";
import { cn } from "@/lib/utils";
import { ResolvedPlatform } from "./types";

const MECHANISM_LABEL: Record<ResolvedPlatform["mechanism"], string> = {
  automation: "Automated",
  extension: "Via extension",
  unconnected: "Not connected",
};

const MECHANISM_VARIANT: Record<ResolvedPlatform["mechanism"], "success" | "info" | "outline"> = {
  automation: "success",
  extension: "info",
  unconnected: "outline",
};

export function PlatformRow({
  platform,
  checked,
  onToggle,
}: {
  platform: ResolvedPlatform;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const isUnconnected = platform.mechanism === "unconnected";

  return (
    <div
      role="button"
      tabIndex={isUnconnected ? -1 : 0}
      onClick={() => !isUnconnected && onToggle(platform.id)}
      onKeyDown={(e) => {
        if (!isUnconnected && (e.key === "Enter" || e.key === " ")) onToggle(platform.id);
      }}
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
        isUnconnected
          ? "cursor-not-allowed opacity-60"
          : checked
          ? "cursor-pointer border-primary bg-primary/5"
          : "cursor-pointer border-input hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-3">
        <PlatformLogo platformId={platform.id} className="h-6 w-14 px-1.5 shrink-0" />
        <p className="text-sm font-medium">{platform.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={MECHANISM_VARIANT[platform.mechanism]}>{MECHANISM_LABEL[platform.mechanism]}</Badge>
        {isUnconnected ? (
          <Link
            href="/settings"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-primary underline underline-offset-2"
          >
            Connect
          </Link>
        ) : (
          <Badge variant={checked ? "default" : "outline"}>{checked ? "Selected" : "Select"}</Badge>
        )}
      </div>
    </div>
  );
}
