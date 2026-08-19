"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { crossPost } from "@/lib/actions/crosspost";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { Clock, CheckCircle2, XCircle, Puzzle, RotateCcw } from "lucide-react";
import { PlatformListingSummary } from "./types";

export function PublishConfirmationDialog({
  listingId,
  automationIds,
  extensionIds,
  platformListings,
  onOpenChange,
}: {
  listingId: string;
  automationIds: string[];
  extensionIds: string[];
  platformListings: PlatformListingSummary[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(platform: string) {
    setRetrying(platform);
    const result = await crossPost(listingId, [platform]);
    setRetrying(null);
    if (result.error) toast.error(result.error);
    else toast.success(`Retrying ${getPlatform(platform)?.name ?? platform}`);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publishing to {automationIds.length + extensionIds.length} marketplace{automationIds.length + extensionIds.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Publishing continues in the background — check Platform status anytime.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {automationIds.map((platform) => {
            const info = getPlatform(platform);
            const listing = platformListings.find((pl) => pl.platform === platform);
            const status = listing?.status ?? "PENDING";
            return (
              <div key={platform} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <span className="text-sm font-medium">{info?.name ?? platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
                  {status === "FAILED" && (
                    <button
                      type="button"
                      onClick={() => retry(platform)}
                      disabled={retrying === platform}
                      aria-label={`Retry ${platform}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {extensionIds.map((platform) => {
            const info = getPlatform(platform);
            return (
              <div key={platform} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium">{info?.name ?? platform}</span>
                </div>
                <span className="text-xs text-muted-foreground">Sent to extension</span>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "POSTED" || status === "SOLD") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "FAILED") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function statusLabel(status: string) {
  if (status === "POSTED") return "Published";
  if (status === "SOLD") return "Published";
  if (status === "FAILED") return "Failed";
  if (status === "DELISTED") return "Delisted";
  return "Queued";
}
