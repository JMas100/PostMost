"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crossPost } from "@/lib/actions/crosspost";
import { PlatformBadge } from "@/components/platform-badge";

export function RetryablePlatformBadge({
  listingId,
  platform,
  status,
  externalUrl,
}: {
  listingId: string;
  platform: string;
  status: string;
  externalUrl?: string | null;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    const result = await crossPost(listingId, [platform]);
    setRetrying(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Retrying ${platform}`);
    }
    router.refresh();
  }

  return (
    <PlatformBadge
      platform={platform}
      status={status}
      externalUrl={externalUrl}
      onRetry={status === "FAILED" && !retrying ? retry : undefined}
    />
  );
}
