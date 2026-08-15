"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crossPost } from "@/lib/actions/crosspost";
import { MarketplaceSelector, useMarketplaceSelector } from "@/components/marketplace-selector";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CrossPostForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { selected, setSelected } = useMarketplaceSelector();
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error("Select at least one marketplace");
      return;
    }
    setPosting(true);
    const result = await crossPost(listingId, selected);
    setPosting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cross-post jobs queued");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <MarketplaceSelector selected={selected} onChange={setSelected} />
      <Button type="submit" className="w-full" disabled={posting}>
        {posting ? "Publishing..." : "Publish to selected"}
      </Button>
      <p className="text-xs text-muted-foreground">
        API-enabled marketplaces will post directly. Automation-only marketplaces will queue for manual credential setup.
      </p>
    </form>
  );
}
