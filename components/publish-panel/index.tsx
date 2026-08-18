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
import { PublishPanelProps } from "./types";

export function PublishPanel({ listingId, accounts, extensionListing, hasActiveJobs }: PublishPanelProps) {
  const router = useRouter();
  const extensionInstalled = useExtensionDetector();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  useJobPolling(listingId, hasActiveJobs);

  const platforms = useMemo(
    () => resolveMechanisms(accounts, extensionInstalled === true),
    [accounts, extensionInstalled]
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
      const parts: string[] = [];
      if (automationIds.length) parts.push(`${automationIds.length} via automation`);
      if (extensionIds.length) parts.push(`${extensionIds.length} via extension`);
      toast.success(`Publishing to ${chosen.length} marketplace${chosen.length > 1 ? "s" : ""} (${parts.join(", ")})`);
    }

    setSelected(new Set());
    router.refresh();
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
