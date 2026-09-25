"use client";

import { useEffect, useState } from "react";
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
const EXTENSION_POLL_MS = 3500;

/**
 * The payoff for a publish -- watched live as each marketplace confirms, not asserted with a
 * static "you're all set". Reused wherever a publish happens (this panel's own Publish click,
 * and the composer's create-and-publish in Review): same states, same framing, because the
 * promise should be demonstrated the same way every time.
 *
 * The headline counts what went live, never what failed -- three of four succeeding is still the
 * product doing what it promised, and framing it as an error teaches the opposite. Retry is
 * always scoped to the one marketplace that needs it.
 *
 * "done" only ever tracks automation rows -- they're the only ones that resolve on their own
 * within roughly a minute. Extension rows are inherently user-paced (posting happens live in the
 * seller's own browser tab, whenever they get to it, not on any timer this app controls), so they
 * never gate the footer the way a stuck automation job would; they get their own live status
 * instead, polled independently for as long as this dialog stays open.
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

  const rows = [
    ...automationIds.map((platform) => ({
      platform,
      mechanism: "automation" as const,
      listing: platformListings.find((pl) => pl.platform === platform),
    })),
    ...extensionIds.map((platform) => ({
      platform,
      mechanism: "extension" as const,
      listing: platformListings.find((pl) => pl.platform === platform),
    })),
  ];
  const automationRows = rows.filter((r) => r.mechanism === "automation");
  const stillActive = automationRows.some((r) => ACTIVE_STATUSES.has(r.listing?.status ?? "PENDING"));
  // Counts both mechanisms together -- a pure-extension publish that's already live for every
  // platform is exactly as much of a success as an all-automation one, and used to read as one
  // ("Publishing didn't go through") purely because this only ever looked at automationIds.
  const liveCount = rows.filter((r) => r.listing?.status === "POSTED" || r.listing?.status === "SOLD").length;
  // FAILED is only reachable for automation rows -- the extension sync endpoint
  // (app/api/extension/sync/route.ts) only ever reports "posted"/"sold", never a failure, so
  // there's no equivalent terminal-failure state for an extension row yet.
  const failedCount = automationRows.filter((r) => r.listing?.status === "FAILED").length;
  const total = rows.length;
  const done = !stillActive;

  // Keeps re-fetching platformListings (via router.refresh(), same mechanic useJobPolling uses
  // for automation jobs) for as long as any extension row here hasn't shown up as POSTED/SOLD
  // yet -- so if the seller finishes posting in the marketplace tab while this dialog is still
  // open, it updates to a real confirmation instead of sitting on "Sent to extension" forever.
  // Naturally bounded by the dialog's own lifecycle: the interval is torn down on unmount, i.e.
  // whenever this closes, so nothing polls in the background after that.
  const extensionPendingCount = rows.filter(
    (r) => r.mechanism === "extension" && r.listing?.status !== "POSTED" && r.listing?.status !== "SOLD"
  ).length;
  useEffect(() => {
    if (extensionPendingCount === 0) return;
    const id = setInterval(() => router.refresh(), EXTENSION_POLL_MS);
    return () => clearInterval(id);
  }, [extensionPendingCount, router]);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {done
              ? liveCount > 0
                ? `It's live in ${liveCount} place${liveCount === 1 ? "" : "s"}`
                : extensionIds.length > 0
                  ? "Sent to your browser extension"
                  : "Publishing didn't go through"
              : `Posting to ${total} marketplace${total === 1 ? "" : "s"}`}
          </DialogTitle>
          <DialogDescription>
            {done
              ? liveCount > 0 && failedCount > 0
                ? "The ones that went live stay live — nothing gets rolled back."
                : liveCount > 0
                  ? "Every listing works exactly like this from here."
                  : extensionIds.length > 0
                    ? "Open the PostMost extension popup, then click each marketplace to finish posting — we'll update this once you do."
                    : "None of the marketplaces confirmed. Retry below, or check Platform status."
              : "Usually under a minute. You can leave this page — we'll finish and tell you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map(({ platform, mechanism, listing }) => {
            const info = getPlatform(platform);
            const status = listing?.status ?? "PENDING";
            const isLive = status === "POSTED" || status === "SOLD";
            return (
              <div key={platform} className={cn("flex items-center justify-between rounded-lg border p-3 transition-colors", isLive ? "border-primary/30" : "")}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} mechanism={mechanism} />
                  <span className="text-sm font-medium">{info?.name ?? platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLive && listing?.externalUrl ? (
                    <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                      View on {info?.name ?? platform}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {mechanism === "extension" ? "Waiting on you" : statusLabel(status)}
                    </span>
                  )}
                  {mechanism === "automation" && status === "FAILED" && (
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

function StatusIcon({ status, mechanism }: { status: string; mechanism: "automation" | "extension" }) {
  if (status === "POSTED" || status === "SOLD") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "FAILED") return <XCircle className="h-4 w-4 text-destructive" />;
  if (mechanism === "extension") return <Puzzle className="h-4 w-4 text-info" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function statusLabel(status: string) {
  if (status === "FAILED") return "Failed";
  if (status === "DELISTED") return "Delisted";
  if (status === "RUNNING") return "Uploading";
  return "Queued";
}
