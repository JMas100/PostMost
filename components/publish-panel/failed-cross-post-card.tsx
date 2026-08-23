"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RotateCcw } from "lucide-react";
import { crossPost } from "@/lib/actions/crosspost";
import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";
import { getPlatform } from "@/lib/marketplaces/platforms";

export function FailedCrossPostCard({
  listingId,
  platform,
  errorMessage,
  updatedAt,
}: {
  listingId: string;
  platform: string;
  errorMessage: string | null;
  updatedAt: Date;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const platformName = getPlatform(platform)?.name ?? platform;

  async function retry() {
    setRetrying(true);
    const result = await crossPost(listingId, [platform]);
    setRetrying(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Retrying ${platformName}`);
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={platform} size={16} />
            <span className="text-sm font-medium">{platformName} didn&apos;t post</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorMessage || "Failed for an unknown reason."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={retry}
        disabled={retrying}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        {retrying ? "Retrying…" : `Retry ${platformName}`}
      </Button>
    </div>
  );
}
