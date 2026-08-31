"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crossPost } from "@/lib/actions/crosspost";
import { Button } from "@/components/ui/button";
import { resolveMechanisms } from "./resolve-mechanism";
import { useExtensionDetector } from "./use-extension-detector";
import { useJobPolling } from "./use-job-polling";
import { PlatformRow } from "./platform-row";
import { PublishConfirmationDialog } from "./publish-confirmation-dialog";
import { PublishPanelProps } from "./types";

export function PublishPanel({ listingId, accounts, extensionListing, hasActiveJobs, platformListings }: PublishPanelProps) {
  const router = useRouter();
  const extensionInstalled = useExtensionDetector();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [confirmation, setConfirmation] = useState<{ automationIds: string[]; extensionIds: string[] } | null>(null);

  useJobPolling(listingId, hasActiveJobs);

  // Platforms with a FAILED listing get their own retry card (FailedCrossPostCard) and platforms
  // already POSTED/SOLD show in the "Where it's live" list -- this panel is specifically for
  // posting somewhere new, so both are excluded here rather than offered twice.
  const alreadyAttempted = useMemo(
    () => new Set(platformListings.filter((pl) => pl.status === "POSTED" || pl.status === "SOLD" || pl.status === "FAILED" || pl.status === "PENDING").map((pl) => pl.platform)),
    [platformListings]
  );

  const platforms = useMemo(
    () => resolveMechanisms(accounts, extensionInstalled === true).filter((p) => !alreadyAttempted.has(p.id)),
    [accounts, extensionInstalled, alreadyAttempted]
  );

  function toggle(id: string) {
    const platform = platforms.find((p) => p.id === id);
    if (!platform || platform.mechanism === "unconnected") return;
    if (platform.mechanism === "extension" && extensionInstalled !== true) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    const chosen = platforms.filter((p) => selected.has(p.id));
    if (chosen.length === 0) {
      toast.error("Select at least one marketplace");
      return;
    }

    const automationIds = chosen.filter((p) => p.mechanism === "automation").map((p) => p.id);
    const extensionIds = chosen.filter((p) => p.mechanism === "extension").map((p) => p.id);

    setPublishing(true);

    let automationFailed = false;
    if (automationIds.length > 0) {
      const result = await crossPost(listingId, automationIds);
      if (result.error) {
        toast.error(result.error);
        automationFailed = true;
      } else {
        const failed = (result.results ?? []).filter((r) => !r.success);
        if (failed.length > 0) {
          toast.error(`Failed to queue: ${failed.map((f) => f.platformId).join(", ")}`);
        }
      }
    }

    if (extensionIds.length > 0) {
      sendToExtension(extensionListing, extensionIds);
    }

    setPublishing(false);

    if (!automationFailed) {
      setConfirmation({ automationIds, extensionIds });
    }

    setSelected(new Set());
    router.refresh();
  }

  if (platforms.length === 0) {
    return <p className="text-sm text-muted-foreground">Posted everywhere it can be right now.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {platforms.map((platform) => (
          <PlatformRow key={platform.id} platform={platform} checked={selected.has(platform.id)} onToggle={toggle} />
        ))}
      </div>
      <Button onClick={handlePublish} className="w-full" disabled={publishing || selected.size === 0}>
        {publishing
          ? "Publishing..."
          : selected.size === 0
          ? "Publish"
          : `Publish to ${selected.size} marketplace${selected.size === 1 ? "" : "s"}`}
      </Button>

      {confirmation && (
        <PublishConfirmationDialog
          listingId={listingId}
          automationIds={confirmation.automationIds}
          extensionIds={confirmation.extensionIds}
          platformListings={platformListings}
          onOpenChange={(open) => {
            if (!open) setConfirmation(null);
          }}
        />
      )}
    </div>
  );
}

function sendToExtension(listing: PublishPanelProps["extensionListing"], platformIds: string[]) {
  const payload = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    quantity: listing.quantity,
    condition: listing.condition,
    category: listing.category,
    brand: listing.brand,
    size: listing.size,
    color: listing.color,
    material: listing.material,
    sku: listing.sku,
    photos: listing.photos.map((p) => p.url),
  };

  function onAck(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data;
    if (data?.source !== "postmost-extension") return;
    window.removeEventListener("message", onAck);
    if (data.type === "ACK") {
      toast.success("Sent to PostMost extension. Open the extension popup to post.");
    } else if (data.type === "ERROR") {
      toast.error(data.message || "Extension failed to save listing");
    }
  }

  window.addEventListener("message", onAck);
  window.postMessage(
    { source: "postmost", type: "SEND_LISTING", listing: payload, platforms: platformIds },
    "*"
  );
}
