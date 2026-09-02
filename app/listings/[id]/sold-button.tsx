"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markListingSold } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPlatform } from "@/lib/marketplaces/platforms";

/** Doesn't match any real platform id, so markListingSold credits no platform as "sold" and
 *  correctly attempts to auto-delist every connected platform instead. */
const SOLD_ELSEWHERE = "__sold_elsewhere__";

export function SoldButton({
  listingId,
  postedPlatforms,
  disabled,
}: {
  listingId: string;
  postedPlatforms: string[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [selected, setSelected] = useState<string>(postedPlatforms.length === 1 ? postedPlatforms[0] : "");
  const router = useRouter();

  function handleClick() {
    if (postedPlatforms.length > 0 && !selected) {
      setMessage("Choose where it sold first.");
      return;
    }
    startTransition(async () => {
      const result = await markListingSold(listingId, selected || undefined);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(
          postedPlatforms.length > 1
            ? "Marked as sold. Delisting from the rest is queued."
            : "Marked as sold. Delisting from connected platforms is queued."
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {postedPlatforms.length > 1 && (
        <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Where did it sell?" />
          </SelectTrigger>
          <SelectContent>
            {postedPlatforms.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {getPlatform(platform)?.name ?? platform}
              </SelectItem>
            ))}
            <SelectItem value={SOLD_ELSEWHERE}>Sold elsewhere / in person</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button variant="outline" className="w-full" disabled={disabled || isPending} onClick={handleClick}>
        {isPending ? "Marking..." : "Mark as sold"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
