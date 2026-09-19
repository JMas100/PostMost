"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
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
  warning,
}: {
  platform: ResolvedPlatform;
  checked: boolean;
  onToggle: (id: string) => void;
  /** Shown live, before Publish is ever clicked -- e.g. Poshmark needing a Women/Men/Kids/Home/
   *  Pets/Electronics category it can't infer from this listing's current data. */
  warning?: string;
}) {
  const isUnconnected = platform.mechanism === "unconnected";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border",
        !isUnconnected && checked && "border-primary"
      )}
    >
      <div
        role="button"
        tabIndex={isUnconnected ? -1 : 0}
        onClick={() => !isUnconnected && onToggle(platform.id)}
        onKeyDown={(e) => {
          if (!isUnconnected && (e.key === "Enter" || e.key === " ")) onToggle(platform.id);
        }}
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 p-3 text-left transition-colors",
          isUnconnected
            ? "cursor-not-allowed opacity-60"
            : checked
            ? "cursor-pointer bg-primary/5"
            : "cursor-pointer hover:bg-muted"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <PlatformLogo platform={platform.id} size={40} onDark className="shrink-0" />
          <p className="truncate text-sm font-medium">{platform.name}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
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
      {warning && (
        <div className="flex items-start gap-1.5 border-t bg-warning/5 p-2.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
