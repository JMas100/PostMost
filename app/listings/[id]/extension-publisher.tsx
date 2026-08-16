"use client";

import { useEffect, useState } from "react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Puzzle } from "lucide-react";

interface ExtensionPublisherProps {
  listing: {
    id: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    condition: string;
    category: string;
    brand: string | null;
    size: string | null;
    color: string | null;
    material: string | null;
    sku: string | null;
    photos: { id: string; url: string }[];
  };
}

const MANUAL_PLATFORMS = PLATFORMS.filter((p) => p.authType === "manual");

export function ExtensionPublisher({ listing }: ExtensionPublisherProps) {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (data?.source === "postmost-extension") {
        setInstalled(true);
      }
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: "postmost", type: "PING" }, "*");

    const timer = setTimeout(() => {
      if (installed === null) setInstalled(false);
    }, 2000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [installed]);

  function togglePlatform(platformId: string) {
    setSelected((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  }

  function sendToExtension() {
    if (selected.length === 0) {
      toast.error("Select at least one marketplace");
      return;
    }

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
      { source: "postmost", type: "SEND_LISTING", listing: payload, platforms: selected },
      "*"
    );
  }

  if (installed === null) {
    return <p className="text-sm text-muted-foreground">Checking for extension...</p>;
  }

  if (installed === false) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>PostMost browser extension not detected.</p>
        <p>
          Load it in Chrome developer mode from{" "}
          <code className="rounded bg-muted px-1 py-0.5">extensions/postmost</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MANUAL_PLATFORMS.map((platform) => (
          <Button
            key={platform.id}
            type="button"
            variant={selected.includes(platform.id) ? "default" : "outline"}
            size="sm"
            onClick={() => togglePlatform(platform.id)}
            style={selected.includes(platform.id) ? {} : { borderColor: platform.color, color: platform.color }}
          >
            {platform.name}
          </Button>
        ))}
      </div>
      <Button onClick={sendToExtension} className="w-full" disabled={selected.length === 0}>
        <Puzzle className="mr-2 h-4 w-4" />
        Send to extension
      </Button>
      <p className="text-xs text-muted-foreground">
        Opens each marketplace in a new tab and pre-fills the listing form.
      </p>
    </div>
  );
}
