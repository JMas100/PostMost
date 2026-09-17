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
import { listingDescriptionFields } from "@/lib/marketplaces/listing-fields";
import { getPlatformListingWarning } from "@/lib/marketplaces/client-validation";

export function PublishPanel({ listingId, accounts, extensionListing, hasActiveJobs, platformListings, initialPublishedPlatforms }: PublishPanelProps) {
  const router = useRouter();
  const extensionInstalled = useExtensionDetector();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  // Seeded once, on mount, when arriving straight from the composer's own publish (see
  // ?published= handling on the listing detail page) -- shows the exact same payoff dialog a
  // Publish click from this panel would, so the "watched live" experience isn't special to one
  // entry point.
  const [confirmation, setConfirmation] = useState<{ automationIds: string[]; extensionIds: string[] } | null>(
    initialPublishedPlatforms && initialPublishedPlatforms.length > 0
      ? { automationIds: initialPublishedPlatforms, extensionIds: [] }
      : null
  );

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

  // Shown live, next to each platform's own row, before Publish is ever clicked -- same check
  // the listing wizard runs (lib/marketplaces/client-validation.ts). This listing is already
  // saved, so unlike the wizard there's no live form to react to -- these are static per the
  // listing's current saved data.
  const platformWarnings = useMemo(() => {
    const warnings: Record<string, string> = {};
    for (const platform of platforms) {
      const warning = getPlatformListingWarning(platform.id, extensionListing);
      if (warning) warnings[platform.id] = warning;
    }
    return warnings;
  }, [platforms, extensionListing]);

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

    // Never send a selected platform into a publish we already know will fail -- the row already
    // shows this warning inline, this is the hard gate on top of it.
    const blocked = chosen.find((p) => platformWarnings[p.id]);
    if (blocked) {
      toast.error(`${blocked.name}: ${platformWarnings[blocked.id]}`);
      return;
    }

    const automationIds = chosen.filter((p) => p.mechanism === "automation").map((p) => p.id);
    const extensionIds = chosen.filter((p) => p.mechanism === "extension").map((p) => p.id);

    setPublishing(true);

    // Only platforms that actually got queued belong in the success confirmation below -- a
    // pre-flight check (e.g. Poshmark needing a Women/Men/Kids category it can't infer) can
    // reject one platform in a multi-platform publish without the whole request erroring, so
    // this can't just be "did the call succeed."
    let succeededAutomationIds = automationIds;
    if (automationIds.length > 0) {
      const result = await crossPost(listingId, automationIds);
      if (result.error) {
        toast.error(result.error);
        succeededAutomationIds = [];
      } else {
        const failed = (result.results ?? []).filter((r) => !r.success);
        // One toast per platform with its actual reason -- collapsing everything into "Failed
        // to queue: poshmark" would throw away the actionable message right when the user most
        // needs to see it, and previously this loop's failures never stopped the success
        // confirmation dialog from opening right after, for every platform including the failed
        // one -- reading as "it silently worked" when it hadn't.
        for (const f of failed) {
          const platformName = platforms.find((p) => p.id === f.platformId)?.name ?? f.platformId;
          toast.error(f.error ? `${platformName}: ${f.error}` : `Failed to queue ${platformName}`);
        }
        const failedIds = new Set(failed.map((f) => f.platformId));
        succeededAutomationIds = automationIds.filter((id) => !failedIds.has(id));
      }
    }

    if (extensionIds.length > 0) {
      sendToExtension(extensionListing, extensionIds);
    }

    setPublishing(false);

    if (succeededAutomationIds.length > 0 || extensionIds.length > 0) {
      setConfirmation({ automationIds: succeededAutomationIds, extensionIds });
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
          <PlatformRow
            key={platform.id}
            platform={platform}
            checked={selected.has(platform.id)}
            onToggle={toggle}
            warning={platformWarnings[platform.id]}
          />
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
    ...listingDescriptionFields(listing),
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
