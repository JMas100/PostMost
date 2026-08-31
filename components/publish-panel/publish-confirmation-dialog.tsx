"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { crossPost } from "@/lib/actions/crosspost";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { Clock, CheckCircle2, XCircle, Puzzle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformListingSummary } from "./types";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

/**
 * The payoff for a publish -- watched live as each marketplace confirms, not asserted with a
 * static "you're all set". Reused wherever a publish happens (this panel's own Publish click,
 * and the composer's create-and-publish in Review): same states, same framing, because the
 * promise should be demonstrated the same way every time.
 *
 * The headline counts what went live, never what failed -- three of four succeeding is still the
 * product doing what it promised, and framing it as an error teaches the opposite. Retry is
 * always scoped to the one marketplace that needs it.
 */
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

  const rows = automationIds.map((platform) => ({
    platform,
    listing: platformListings.find((pl) => pl.platform === platform),
  }));
  const stillActive = rows.some((r) => ACTIVE_STATUSES.has(r.listing?.status ?? "PENDING"));
  const liveCount = rows.filter((r) => r.listing?.status === "POSTED" || r.listing?.status === "SOLD").length;
  const failedCount = rows.filter((r) => r.listing?.status === "FAILED").length;
  const total = automationIds.length + extensionIds.length;
  const done = !stillActive;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {done
              ? liveCount > 0
                ? `It's live in ${liveCount} place${liveCount === 1 ? "" : "s"}`
                : "Publishing didn't go through"
              : `Posting to ${total} marketplace${total === 1 ? "" : "s"}`}
          </DialogTitle>
          <DialogDescription>
            {done
              ? liveCount > 0 && failedCount > 0
                ? "The ones that went live stay live — nothing gets rolled back."
                : liveCount > 0
                  ? "Every listing works exactly like this from here."
                  : "None of the marketplaces confirmed. Retry below, or check Platform status."
              : "Usually under a minute. You can leave this page — we'll finish and tell you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map(({ platform, listing }) => {
            const info = getPlatform(platform);
            const status = listing?.status ?? "PENDING";
            return (
              <div key={platform} className={cn("flex items-center justify-between rounded-lg border p-3 transition-colors", status === "POSTED" || status === "SOLD" ? "border-primary/30" : "")}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <span className="text-sm font-medium">{info?.name ?? platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(status === "POSTED" || status === "SOLD") && listing?.externalUrl ? (
                    <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                      View on {info?.name ?? platform}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
                  )}
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

        {done && liveCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Auto-delist is on — whichever marketplace sells it first, the others come down automatically. You won&apos;t sell the same item twice.
          </p>
        )}

        <DialogFooter>
          {done ? (
            <>
              <Link href="/listings/new" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
                List another item
              </Link>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
              Continue in the background
            </Button>
          )}
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
  if (status === "FAILED") return "Failed";
  if (status === "DELISTED") return "Delisted";
  if (status === "RUNNING") return "Uploading";
  return "Queued";
}
